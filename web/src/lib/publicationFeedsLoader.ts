import { resetTamilNaduDvacPressReleaseFeedCache } from "@/lib/tamilNaduDvacPressReleaseFeed";
import { resetTamilNaduGovPressReleaseFeedCache } from "@/lib/tamilNaduGovPressReleaseFeed";
import { resetTamilNaduGovernmentOrdersFeedCache } from "@/lib/tamilNaduGovernmentOrdersFeed";
import { resetTamilNaduMagazineFeedCache } from "@/lib/tamilNaduMagazineFeed";
import { resetTamilNaduPressReleaseFeedCache } from "@/lib/tamilNaduPressReleaseFeed";
import { resetTamilNaduTransfersPostingsFeedCache } from "@/lib/tamilNaduTransfersPostingsFeed";
import { refreshTamilNaduNewsFeedIndex } from "@/lib/tamilNaduNewsFeed";
import {
  ensureTamilNaduDvacPressReleaseFeedLoaded,
} from "@/lib/tamilNaduDvacPressReleaseFeed";
import {
  ensureTamilNaduGovPressReleaseFeedLoaded,
} from "@/lib/tamilNaduGovPressReleaseFeed";
import {
  ensureTamilNaduGovernmentOrdersFeedLoaded,
} from "@/lib/tamilNaduGovernmentOrdersFeed";
import { ensureTamilNaduMagazineFeedLoaded } from "@/lib/tamilNaduMagazineFeed";
import {
  ensureTamilNaduPressReleaseFeedLoaded,
} from "@/lib/tamilNaduPressReleaseFeed";
import {
  ensureTamilNaduTransfersPostingsFeedLoaded,
} from "@/lib/tamilNaduTransfersPostingsFeed";

const dataVersionLoaders = import.meta.glob(
  "../../../Sync-Config/data-version.json",
  { import: "default" },
) as Record<string, () => Promise<{ version?: string }>>;

let appliedDataVersion = "";

export function resetAllPublicationFeedCaches(): void {
  resetTamilNaduPressReleaseFeedCache();
  resetTamilNaduGovPressReleaseFeedCache();
  resetTamilNaduGovernmentOrdersFeedCache();
  resetTamilNaduTransfersPostingsFeedCache();
  resetTamilNaduMagazineFeedCache();
  resetTamilNaduDvacPressReleaseFeedCache();
  refreshTamilNaduNewsFeedIndex();
}

async function applyDataVersionIfNeeded(): Promise<void> {
  const loader = Object.values(dataVersionLoaders)[0];
  if (!loader) return;
  try {
    const payload = await loader();
    const version = payload?.version ?? "";
    if (!version || version === appliedDataVersion) return;
    appliedDataVersion = version;
    resetAllPublicationFeedCaches();
  } catch {
    // Manifest missing before first sync — ignore.
  }
}

async function preparePublicationFeeds(): Promise<void> {
  await applyDataVersionIfNeeded();
}

export async function refreshBundledDataIfStale(): Promise<void> {
  await applyDataVersionIfNeeded();
}

/** Loads publication JSON chunks on demand (dashboard + publication pages). */
export async function ensureDashboardPublicationFeedsLoaded(): Promise<void> {
  await preparePublicationFeeds();
  await Promise.all([
    ensureTamilNaduPressReleaseFeedLoaded(),
    ensureTamilNaduGovPressReleaseFeedLoaded(),
    ensureTamilNaduGovernmentOrdersFeedLoaded(),
    ensureTamilNaduTransfersPostingsFeedLoaded(),
    ensureTamilNaduMagazineFeedLoaded(),
    ensureTamilNaduDvacPressReleaseFeedLoaded(),
  ]);
}

export async function ensurePressReleasePageFeedsLoaded(): Promise<void> {
  await preparePublicationFeeds();
  await ensureTamilNaduPressReleaseFeedLoaded();
}

export async function ensureGovPressReleasePageFeedsLoaded(): Promise<void> {
  await preparePublicationFeeds();
  await ensureTamilNaduGovPressReleaseFeedLoaded();
}

export async function ensureGovernmentOrdersPageFeedsLoaded(): Promise<void> {
  await preparePublicationFeeds();
  await ensureTamilNaduGovernmentOrdersFeedLoaded();
}

export async function ensureTransfersPostingsPageFeedsLoaded(): Promise<void> {
  await preparePublicationFeeds();
  await ensureTamilNaduTransfersPostingsFeedLoaded();
}

export async function ensureMagazinePageFeedsLoaded(): Promise<void> {
  await preparePublicationFeeds();
  await ensureTamilNaduMagazineFeedLoaded();
}

export async function ensureDvacPressReleasePageFeedsLoaded(): Promise<void> {
  await preparePublicationFeeds();
  await ensureTamilNaduDvacPressReleaseFeedLoaded();
}
