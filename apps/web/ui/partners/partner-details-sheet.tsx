import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
import { rejectPartnerAction } from "@/lib/actions/partners/reject-partner";
import { SHEET_MAX_ITEMS } from "@/lib/partners/constants";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePayouts from "@/lib/swr/use-payouts";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { ThreeDots, X } from "@/ui/shared/icons";
import {
  Button,
  buttonVariants,
  CopyButton,
  MenuItem,
  Popover,
  Sheet,
  StatusBadge,
  Table,
  TabSelect,
  useRouterStuff,
  useTable,
} from "@dub/ui";
import { GreekTemple, User } from "@dub/ui/icons";
import {
  cn,
  COUNTRIES,
  currencyFormatter,
  DICEBEAR_AVATAR_URL,
  fetcher,
  getPrettyUrl,
  nFormatter,
} from "@dub/utils";
import { formatPeriod } from "@dub/utils/src/functions/datetime";
import { ProgramApplication } from "@prisma/client";
import Linkify from "linkify-react";
import { ChevronLeft } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "sonner";
import useSWRImmutable from "swr/immutable";
import { AnimatedEmptyState } from "../shared/animated-empty-state";
import { useCreatePayoutSheet } from "./create-payout-sheet";
import { OnlinePresenceSummary } from "./online-presence-summary";
import { PartnerLinkSelector } from "./partner-link-selector";
import { usePartnerProfileSheet } from "./partner-profile-sheet";
import { PartnerStatusBadges } from "./partner-status-badges";
import { PayoutStatusBadges } from "./payout-status-badges";

type PartnerDetailsSheetProps = {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

type Tab = "payouts" | "links";

function PartnerDetailsSheetContent({
  partner,
  setIsOpen,
}: PartnerDetailsSheetProps) {
  const { slug } = useWorkspace();
  const { program } = useProgram();
  const [tab, setTab] = useState<Tab>("links");

  const { createPayoutSheet, setIsOpen: setCreatePayoutSheetOpen } =
    useCreatePayoutSheet({ nested: true, partnerId: partner.id });

  const badge = PartnerStatusBadges[partner.status];

  return (
    <>
      <div className="flex grow flex-col">
        <div className="flex items-start justify-between p-6">
          <Sheet.Title className="text-xl font-semibold">
            Partner details
          </Sheet.Title>
          <div className="flex items-center gap-2">
            {partner.status === "approved" && <Menu partner={partner} />}
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
        </div>
        <div className="border-y border-neutral-200 bg-neutral-50 p-6">
          {/* Basic info */}
          <div className="flex items-start justify-between gap-6">
            <div>
              <img
                src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-12 rounded-full"
              />
              <div className="mt-4 flex items-start gap-2">
                <span className="text-lg font-semibold leading-tight text-neutral-900">
                  {partner.name}
                </span>
                {badge && (
                  <StatusBadge icon={null} variant={badge.variant}>
                    {badge.label}
                  </StatusBadge>
                )}
              </div>
              {partner.email && (
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="text-sm text-neutral-500">
                    {partner.email}
                  </span>
                  <CopyButton
                    value={partner.email}
                    variant="neutral"
                    className="p-1 [&>*]:h-3 [&>*]:w-3"
                    successMessage="Copied email to clipboard!"
                  />
                </div>
              )}
            </div>
            <div className="flex min-w-[40%] shrink grow basis-1/2 flex-col items-end justify-end gap-2">
              {partner.country && (
                <div className="flex min-w-20 items-center gap-2 rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-700">
                  <img
                    alt=""
                    src={`https://flag.vercel.app/m/${partner.country}.svg`}
                    className="h-3 w-4 rounded-sm"
                  />
                  <span className="truncate">{COUNTRIES[partner.country]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {partner.status === "approved" && (
            <div className="xs:grid-cols-4 mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200">
              {[
                [
                  "Clicks",
                  !partner.clicks
                    ? "-"
                    : nFormatter(partner.clicks, { full: true }),
                ],
                [
                  "Leads",
                  !partner.leads
                    ? "-"
                    : nFormatter(partner.leads, { full: true }),
                ],
                [
                  "Sales",
                  !partner.sales
                    ? "-"
                    : nFormatter(partner.sales, { full: true }),
                ],
                [
                  "Revenue",
                  !partner.saleAmount
                    ? "-"
                    : currencyFormatter(partner.saleAmount / 100, {
                        minimumFractionDigits:
                          partner.saleAmount % 1 === 0 ? 0 : 2,
                        maximumFractionDigits: 2,
                      }),
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col bg-neutral-50 p-3">
                  <span className="text-xs text-neutral-500">{label}</span>
                  <span className="text-base text-neutral-900">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* <div className="xs:grid-cols-2 mt-4 grid grid-cols-1 gap-3">
            <Link
              href={`/${slug}/analytics?programId=${program!.id}&partnerId=${partner.id}&interval=all`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-8 items-center justify-center gap-2 rounded-lg border px-2 text-sm",
              )}
            >
              <LinesY className="size-4 text-neutral-900" />
              Analytics
            </Link>
            <Link
              href={`/${slug}/events?programId=${program!.id}&partnerId=${partner.id}&interval=all`}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-8 items-center justify-center gap-2 rounded-lg border px-2 text-sm",
              )}
            >
              <CursorRays className="size-4 text-neutral-900" />
              Events
            </Link>
          </div> */}

          {partner.status === "approved" && (
            <div className="-mb-6 mt-2 flex items-center gap-2">
              <TabSelect
                options={[
                  { id: "links", label: "Links" },
                  { id: "payouts", label: "Payouts" },
                  {
                    id: "sales",
                    label: "Sales",
                    href: `/${slug}/programs/${program!.id}/sales?partnerId=${partner.id}`,
                  },
                ]}
                selected={tab}
                onSelect={(id: Tab) => {
                  setTab(id);
                }}
              />
            </div>
          )}
        </div>

        <div className="grow p-6">
          {partner.status === "approved" ? (
            <>
              {tab === "payouts" && <PartnerPayouts partner={partner} />}
              {tab === "links" && <PartnerLinks partner={partner} />}
            </>
          ) : (
            <div className="grid grid-cols-1 gap-8 text-sm text-neutral-500">
              <div>
                <h4 className="font-semibold text-neutral-900">
                  Online presence
                </h4>
                <OnlinePresenceSummary partner={partner} className="mt-2" />
              </div>
              <div>
                <h4 className="font-semibold text-neutral-900">Description</h4>
                <p className="mt-2">
                  {partner.description || (
                    <span className="italic text-neutral-400">
                      No description provided
                    </span>
                  )}
                </p>
              </div>
              {partner.applicationId && (
                <>
                  <hr className="border-neutral-200" />
                  <PartnerApplication applicationId={partner.applicationId} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {partner.status === "pending" && (
        <div className="flex grow flex-col justify-end">
          <div className="border-t border-neutral-200 p-5">
            <PartnerApproval partner={partner} setIsOpen={setIsOpen} />
          </div>
        </div>
      )}

      {partner.status === "approved" && (
        <>
          {createPayoutSheet}
          <div className="flex grow flex-col justify-end">
            <div className="border-t border-neutral-200 p-5">
              <Button
                variant="primary"
                text="Create payout"
                onClick={() => setCreatePayoutSheetOpen(true)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function PartnerApplication({ applicationId }: { applicationId: string }) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { data: application } = useSWRImmutable<ProgramApplication>(
    program &&
      workspaceId &&
      `/api/programs/${program.id}/applications/${applicationId}?workspaceId=${workspaceId}`,
    fetcher,
  );

  const fields = [
    {
      title: `How do you plan to promote ${program?.name}?`,
      value: application?.proposal,
    },
    {
      title: "Any additional questions or comments?",
      value: application?.comments,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6">
      {fields.map((field) => (
        <div key={field.title}>
          <h4 className="font-semibold text-neutral-900">{field.title}</h4>
          <div className="mt-1.5">
            {field.value || field.value === "" ? (
              <Linkify
                as="p"
                options={{
                  target: "_blank",
                  rel: "noopener noreferrer nofollow",
                  className:
                    "underline underline-offset-4 text-neutral-400 hover:text-neutral-700",
                }}
              >
                {field.value || "No response provided"}
              </Linkify>
            ) : (
              <div className="h-5 w-28 min-w-0 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PartnerApproval({
  partner,
  setIsOpen,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const [isApproving, setIsApproving] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    if (selectedLinkId) setLinkError(false);
  }, [selectedLinkId]);

  const { executeAsync, isPending } = useAction(approvePartnerAction, {
    onSuccess() {
      mutatePrefix(
        `/api/partners?workspaceId=${workspaceId}&programId=${program!.id}`,
      );

      toast.success("Approved the partner successfully.");
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to approve partner.");
    },
  });

  const createLink = async (search: string) => {
    if (!search) throw new Error("No link entered");

    const shortKey = search.startsWith(program?.domain + "/")
      ? search.substring((program?.domain + "/").length)
      : search;

    const response = await fetch(`/api/links?workspaceId=${workspaceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: program?.domain,
        key: shortKey,
        url: program?.url,
        trackConversion: true,
        programId: program?.id,
        folderId: program?.defaultFolderId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const { error } = result;
      throw new Error(error.message);
    }

    setSelectedLinkId(result.id);

    return result.id;
  };

  return (
    <div className="flex">
      <div
        className={cn(
          "transition-[width] duration-300",
          isApproving ? "w-[52px]" : "w-[83px]",
        )}
      >
        {isApproving ? (
          <Button
            type="button"
            variant="secondary"
            icon={<ChevronLeft className="size-4 shrink-0" />}
            onClick={() => {
              setIsApproving(false);
              setSelectedLinkId(null);
            }}
          />
        ) : (
          <PartnerRejectButton partner={partner} setIsOpen={setIsOpen} />
        )}
      </div>

      <div className="flex grow pl-2">
        <div
          className={cn(
            "w-0 transition-[width] duration-300",
            isApproving && "w-full",
          )}
        >
          <div className="w-[calc(100%-8px)]">
            <PartnerLinkSelector
              selectedLinkId={selectedLinkId}
              setSelectedLinkId={setSelectedLinkId}
              showDestinationUrl={false}
              onCreate={async (search) => {
                try {
                  await createLink(search);
                  return true;
                } catch (error) {
                  toast.error(error?.message ?? "Failed to create link");
                }
                return false;
              }}
              error={linkError}
            />
          </div>
        </div>

        <div className="grow">
          <Button
            type="button"
            variant="primary"
            text="Approve"
            loading={isPending}
            onClick={async () => {
              if (!isApproving) {
                setIsApproving(true);
                setLinkError(false);
                return;
              }

              if (!selectedLinkId) {
                setLinkError(true);
                return;
              }

              if (!program) {
                return;
              }

              // Approve partner
              await executeAsync({
                workspaceId: workspaceId!,
                partnerId: partner.id,
                programId: program.id,
                linkId: selectedLinkId,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PartnerRejectButton({
  partner,
  setIsOpen,
}: {
  partner: EnrolledPartnerProps;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { id: workspaceId } = useWorkspace();
  const { program } = useProgram();

  const { executeAsync, isPending } = useAction(rejectPartnerAction, {
    onSuccess: async () => {
      await mutatePrefix(
        `/api/partners?workspaceId=${workspaceId}&programId=${program!.id}`,
      );

      toast.success("Partner rejected successfully.");
      setIsOpen(false);
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to reject partner.");
    },
  });

  return (
    <Button
      type="button"
      variant="secondary"
      text={isPending ? "" : "Reject"}
      loading={isPending}
      onClick={async () => {
        await executeAsync({
          workspaceId: workspaceId!,
          partnerId: partner.id,
          programId: program!.id,
        });
      }}
    />
  );
}

function PartnerPayouts({ partner }: { partner: EnrolledPartnerProps }) {
  const { slug } = useWorkspace();
  const { program } = useProgram();

  const {
    payouts,
    error: payoutsError,
    loading,
  } = usePayouts({
    query: { partnerId: partner.id, pageSize: SHEET_MAX_ITEMS },
  });

  const table = useTable({
    data: payouts || [],
    loading: loading,
    error: payoutsError ? "Failed to load payouts" : undefined,
    columns: [
      {
        header: "Period",
        accessorFn: (d) => formatPeriod(d),
      },
      {
        header: "Status",
        cell: ({ row }) => {
          const badge = PayoutStatusBadges[row.original.status];
          return badge ? (
            <StatusBadge icon={badge.icon} variant={badge.variant}>
              {badge.label}
            </StatusBadge>
          ) : (
            "-"
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (d) =>
          currencyFormatter(d.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ],
    onRowClick: (row) => {
      window.open(
        `/${slug}/programs/${program!.id}/payouts?payoutId=${row.original.id}`,
        "_blank",
      );
    },
    resourceName: (p) => `payout${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
  } as any);

  return (payouts && payouts.length > 0) || loading ? (
    <>
      <Table {...table} />
      <div className="mt-2 flex justify-end">
        <Link
          href={`/${slug}/programs/${program!.id}/payouts?partnerId=${partner.id}`}
          target="_blank"
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-7 items-center rounded-lg border px-2 text-sm",
          )}
        >
          View all
        </Link>
      </div>
    </>
  ) : (
    <AnimatedEmptyState
      className="md:min-h-80"
      title="No payouts"
      description="When this partner is eligible for or has received payouts, they will appear here."
      cardContent={() => (
        <>
          <div className="flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
            <GreekTemple className="size-4 text-neutral-700" />
          </div>
          <div className="h-2.5 w-28 min-w-0 rounded-sm bg-neutral-200" />
        </>
      )}
    />
  );
}

const PartnerLinks = ({ partner }: { partner: EnrolledPartnerProps }) => {
  const { slug } = useWorkspace();

  const table = useTable({
    data: partner.links || [],
    columns: [
      {
        id: "shortLink",
        header: "Link",
        cell: ({ row }) => (
          <b className="font-medium text-black">
            {getPrettyUrl(row.original.shortLink)}
          </b>
        ),
      },
      {
        header: "Clicks",
        accessorFn: (d) => nFormatter(d.clicks),
        size: 1,
        minSize: 1,
      },
      {
        header: "Leads",
        accessorFn: (d) => nFormatter(d.leads),
        size: 1,
        minSize: 1,
      },
      {
        header: "Sales",
        accessorFn: (d) => nFormatter(d.sales),
        size: 1,
        minSize: 1,
      },
      {
        header: "Revenue",
        accessorFn: (d) =>
          currencyFormatter(d.saleAmount / 100, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }),
        size: 1,
        minSize: 1,
      },
    ],
    onRowClick: (row) => {
      window.open(
        `/${slug}/events?domain=${row.original.domain}&key=${row.original.key}&interval=all`,
        "_blank",
      );
    },
    resourceName: (p) => `link${p ? "s" : ""}`,
    thClassName: (id) =>
      cn(id === "total" && "[&>div]:justify-end", "border-l-0"),
    tdClassName: (id) => cn(id === "total" && "text-right", "border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
  } as any);

  return <Table {...table} />;
};

function Menu({ partner }: { partner: EnrolledPartnerProps }) {
  const [openPopover, setOpenPopover] = useState(false);

  const { partnerProfileSheet, setIsOpen: setPartnerProfileSheetOpen } =
    usePartnerProfileSheet({ nested: true, partner });

  return (
    <>
      {partnerProfileSheet}
      <Popover
        content={
          <div className="grid w-full gap-px p-1.5 sm:w-48">
            <MenuItem
              icon={User}
              onClick={() => {
                setOpenPopover(false);
                setPartnerProfileSheetOpen(true);
              }}
            >
              View profile
            </MenuItem>
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <Button
          variant="secondary"
          className={cn(
            "h-[1.875rem] w-fit px-1.5 outline-none transition-all duration-200",
            "border-transparent data-[state=open]:border-neutral-500 sm:group-hover/card:data-[state=closed]:border-neutral-200",
          )}
          icon={
            <ThreeDots className="size-[1.125rem] shrink-0 text-neutral-600" />
          }
          onClick={() => {
            setOpenPopover(!openPopover);
          }}
        />
      </Popover>
    </>
  );
}

export function PartnerDetailsSheet({
  isOpen,
  ...rest
}: PartnerDetailsSheetProps & {
  isOpen: boolean;
}) {
  const { queryParams } = useRouterStuff();
  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "partnerId", scroll: false })}
    >
      <PartnerDetailsSheetContent {...rest} />
    </Sheet>
  );
}
