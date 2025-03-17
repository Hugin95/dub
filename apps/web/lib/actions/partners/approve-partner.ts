"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { EventType } from "@/lib/api/audit-logs/schemas";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { sendEmail } from "@dub/email";
import { PartnerApplicationApproved } from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { getLinkOrThrow } from "../../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { recordLink } from "../../tinybird";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const approvePartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  linkId: z.string(),
});

// Update a partner enrollment
export const approvePartnerAction = authActionClient
  .schema(approvePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { programId, partnerId, linkId } = parsedInput;

    const [program, link] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),
      getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
      }),
    ]);

    if (link.partnerId) {
      throw new Error("Link is already associated with another partner.");
    }

    const [programEnrollment, updatedLink, reward] = await Promise.all([
      prisma.programEnrollment.update({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        data: {
          status: "approved",
        },
        include: {
          partner: true,
        },
      }),

      // update link to have programId and partnerId
      prisma.link.update({
        where: {
          id: linkId,
        },
        data: {
          programId,
          partnerId,
          folderId: program.defaultFolderId,
        },
        include: {
          tags: {
            select: {
              tag: true,
            },
          },
        },
      }),

      determinePartnerReward({
        programId,
        partnerId,
        event: "sale",
      }),
    ]);

    const partner = programEnrollment.partner;

    waitUntil(
      Promise.allSettled([
        recordLink(updatedLink),

        sendEmail({
          subject: `Your application to join ${program.name} partner program has been approved!`,
          email: partner.email!,
          react: PartnerApplicationApproved({
            program: {
              name: program.name,
              logo: program.logo,
              slug: program.slug,
            },
            partner: {
              name: partner.name,
              email: partner.email!,
              payoutsEnabled: Boolean(partner.payoutsEnabledAt),
            },
            rewardDescription: ProgramRewardDescription({
              reward,
            }),
          }),
        }),

        recordAuditLog({
          workspaceId: workspace.id,
          programId: programId,
          actorId: user.id,
          actorName: user.name,
          description: `Approved partner ${partner.name || partner.email} to join the program.`,
          event: {
            type: EventType.PARTNER_APPROVE,
            metadata: {
              id: partnerId,
              name: partner.name,
              email: partner.email!,
            },
          },
        }),

        // TODO: send partner.created webhook
      ]),
    );

    return {
      ok: true,
    };
  });
