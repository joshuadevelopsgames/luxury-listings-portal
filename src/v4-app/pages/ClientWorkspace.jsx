import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, Calendar, Check, ChevronRight, Copy, Download,
  ExternalLink, FolderOpen, Globe, Hash, Image as ImageIcon, Link as LinkIcon,
  Plus, RefreshCw, Sparkles, Star, Upload, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../../services/supabaseService';
import { uploadFile } from '../../services/storageService';
import { openaiService } from '../services/openaiService';

// ── Style constants ──────────────────────────────────────────────────────────

const INPUT = 'w-full h-10 px-3 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 transition-all';
const TEXTAREA = 'w-full px-3 py-2.5 rounded-lg bg-[#f5f5f7] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 resize-none transition-all';
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#0071e3]/20';
const BTN_GHOST = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-[13px] font-medium text-[#1d1d1f] dark:text-white bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed';

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
}

function inferAssetScore(width, height, file) {
  const flags = {};
  let score = 100;
  if (!width || !height) { score -= 20; flags.noDimensions = true; }
  if (width && height && Math.min(width, height) < 1080) { score -= 25; flags.lowResolution = true; }
  if (width && height && width > height * 1.9) { score -= 15; flags.ultraWide = true; }
  if (file?.size && file.size > 8 * 1024 * 1024) { score -= 10; flags.largeFile = true; }
  if (width && height) { flags.orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square'; }
  return { score: Math.max(0, score), flags };
}

async function getImageDimensions(file) {
  if (!file.type.startsWith('image/')) return { width: null, height: null };
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = URL.createObjectURL(file);
  });
}

function detectFolderSource(url = '') {
  if (!url) return 'upload';
  const u = url.toLowerCase();
  if (u.includes('drive.google.com')) return 'google_drive';
  if (u.includes('dropbox.com')) return 'dropbox';
  return 'link';
}

function folderSourceLabel(source) {
  if (source === 'google_drive') return 'Google Drive';
  if (source === 'dropbox') return 'Dropbox';
  if (source === 'link') return 'External Link';
  return 'Uploaded Files';
}

function folderSourceColor(source) {
  if (source === 'google_drive') return 'text-[#34c759]';
  if (source === 'dropbox') return 'text-[#0071e3]';
  return 'text-[#ff9500]';
}

function listingStatus(listing, folders, assets) {
  const hasFolder = folders.some((f) => f.listingId === listing.id);
  if (!hasFolder) return 'needs_folder';
  const hasAssets = assets.some((a) => {
    const folder = folders.find((f) => f.listingId === listing.id);
    return folder && a.folderId === folder.id;
  });
  if (!hasAssets) return 'needs_assets';
  return 'ready';
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const color = score >= 80
    ? 'bg-[#34c759]/15 text-[#34c759]'
    : score >= 50
      ? 'bg-[#ff9500]/15 text-[#ff9500]'
      : 'bg-[#ff3b30]/15 text-[#ff3b30]';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
      <Star className="w-2.5 h-2.5" />
      {score}
    </span>
  );
}

function StatusChip({ status }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#34c759]/15 text-[#34c759]">
        <Check className="w-2.5 h-2.5" /> Ready
      </span>
    );
  }
  if (status === 'needs_assets') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ff9500]/15 text-[#ff9500]">
        <ImageIcon className="w-2.5 h-2.5" /> No Assets
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ff3b30]/15 text-[#ff3b30]">
      <AlertCircle className="w-2.5 h-2.5" /> Needs Folder
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ClientWorkspace() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Data state ──────────────────────────────────────────────────────────
  const [client, setClient] = useState(null);
  const [listings, setListings] = useState([]);
  const [folders, setFolders] = useState([]);          // all folders for this client
  const [allAssets, setAllAssets] = useState([]);       // assets for currently selected folder
  const [loading, setLoading] = useState(true);

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [selectedFolderId, setSelectedFolderId]   = useState(null);
  const [selectedAssetIds, setSelectedAssetIds]   = useState(new Set());

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]         = useState('assets');
  const [captionPlatform, setCaptionPlatform] = useState('instagram');
  const [dropActive, setDropActive]       = useState(false);

  // ── Loading/in-progress state ────────────────────────────────────────────
  const [uploading, setUploading]         = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [rankingPhotos, setRankingPhotos] = useState(false);
  const [pushingToCalendar, setPushingToCalendar] = useState(false);

  // ── Form state: Add Listing ──────────────────────────────────────────────
  const [showAddListing, setShowAddListing] = useState(false);
  const [newListingUrl, setNewListingUrl]   = useState('');
  const [newListingDesc, setNewListingDesc] = useState('');
  const [newListingNotes, setNewListingNotes] = useState('');
  const [savingListing, setSavingListing]   = useState(false);
  // IDs of listings currently being enriched in the background
  const [scrapingIds, setScrapingIds] = useState(new Set());

  // ── Form state: Attach Folder ────────────────────────────────────────────
  const [showAttachFolder, setShowAttachFolder] = useState(false);
  const [folderName, setFolderName]             = useState('');
  const [folderExternalUrl, setFolderExternalUrl] = useState('');
  const [savingFolder, setSavingFolder]         = useState(false);

  // ── Caption state ────────────────────────────────────────────────────────
  const [generatedCaption, setGeneratedCaption]   = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState('');

  // ── Schedule state ───────────────────────────────────────────────────────
  const [scheduleDate, setScheduleDate] = useState('');

  // ── Derived ──────────────────────────────────────────────────────────────

  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedListingId) || null,
    [listings, selectedListingId]
  );

  /** Folders for the selected listing only */
  const listingFolders = useMemo(
    () => folders.filter((f) => f.listingId === selectedListingId),
    [folders, selectedListingId]
  );

  const selectedFolder = useMemo(
    () => listingFolders.find((f) => f.id === selectedFolderId) || listingFolders[0] || null,
    [listingFolders, selectedFolderId]
  );

  const sortedAssets = useMemo(
    () => [...allAssets].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)),
    [allAssets]
  );

  const selectedAssets = useMemo(
    () => sortedAssets.filter((a) => selectedAssetIds.has(a.id)),
    [sortedAssets, selectedAssetIds]
  );

  // Listing status for chips — depends on which folders / assets are loaded
  const listingStatuses = useMemo(() => {
    const map = {};
    for (const l of listings) {
      const hasFolders = folders.some((f) => f.listingId === l.id);
      map[l.id] = hasFolders ? 'ready' : 'needs_folder';
    }
    return map;
  }, [listings, folders]);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadBase = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [{ data: clientRow }, folderRows, listingRows] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, client_name, logo_url, brokerage, profile_photo')
          .eq('id', clientId)
          .maybeSingle(),
        supabaseService.getClientAssetFolders(clientId),
        supabaseService.getClientListings(clientId),
      ]);
      setClient(clientRow || null);
      setFolders(folderRows || []);
      const fetchedListings = listingRows || [];
      setListings(fetchedListings);
      // Auto-select first listing if none selected
      if (!selectedListingId && fetchedListings.length) {
        setSelectedListingId(fetchedListings[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedListingId]);

  const loadAssets = useCallback(async (folderId) => {
    if (!folderId) { setAllAssets([]); return; }
    const rows = await supabaseService.getClientAssets(folderId);
    setAllAssets(rows || []);
    // Pre-select top picks
    const topIds = new Set((rows || []).filter((a) => a.isTopPick).map((a) => a.id));
    if (topIds.size) setSelectedAssetIds(topIds);
  }, []);

  useEffect(() => { loadBase(); }, [clientId]);

  useEffect(() => {
    const folder = listingFolders.find((f) => f.id === selectedFolderId) || listingFolders[0] || null;
    if (folder) {
      setSelectedFolderId(folder.id);
      loadAssets(folder.id);
    } else {
      setAllAssets([]);
      setSelectedAssetIds(new Set());
    }
  }, [selectedListingId, listingFolders.length]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const saveListing = async () => {
    if (!newListingUrl.trim()) return;
    setSavingListing(true);
    try {
      // 1. Save immediately with just the URL — no waiting for scraper
      const created = await supabaseService.createClientListing({
        clientId,
        listingUrl: newListingUrl.trim(),
        sourceDomain: '',
        title: '',
        address: '',
        price: '',
        beds: '',
        baths: '',
        squareFeet: '',
        description: newListingDesc.trim(),
        notes: newListingNotes.trim(),
        rawPayload: {},
      });

      // 2. Reset form + navigate immediately
      setNewListingUrl('');
      setNewListingDesc('');
      setNewListingNotes('');
      setShowAddListing(false);
      await loadBase();
      if (created?.id) setSelectedListingId(created.id);
      toast.success('Listing added — scraping details…');

      // 3. Fire-and-forget background scrape to enrich the listing
      if (created?.id) {
        const listingId = created.id;
        const urlToScrape = created.listingUrl || '';  // captured before state reset
        setScrapingIds((prev) => new Set(prev).add(listingId));
        openaiService.scrapeListing(urlToScrape)
          .then(async (scraped) => {
            if (!scraped || !Object.keys(scraped).length) return;
            await supabaseService.updateClientListing(listingId, {
              sourceDomain: scraped.sourceDomain || '',
              title: scraped.title || '',
              address: scraped.address || '',
              price: scraped.price || '',
              beds: scraped.beds || '',
              baths: scraped.baths || '',
              squareFeet: scraped.squareFeet || '',
              description: scraped.description || '',
              rawPayload: scraped,
            });
            await loadBase();
            toast.success('Listing details filled in ✓');
          })
          .catch(() => { /* scrape failed — listing still usable */ })
          .finally(() => {
            setScrapingIds((prev) => {
              const next = new Set(prev);
              next.delete(listingId);
              return next;
            });
          });
      }
    } catch (err) {
      console.error('[saveListing] failed:', err);
      toast.error('Failed to save listing');
    } finally {
      setSavingListing(false);
    }
  };

  const attachFolder = async () => {
    if (!folderName.trim() || !selectedListingId) return;
    setSavingFolder(true);
    try {
      const source = detectFolderSource(folderExternalUrl);
      const created = await supabaseService.createClientAssetFolder({
        clientId,
        listingId: selectedListingId,
        name: folderName.trim(),
        folderSource: folderExternalUrl.trim() ? source : 'upload',
        externalUrl: folderExternalUrl.trim() || null,
      });
      setFolderName('');
      setFolderExternalUrl('');
      setShowAttachFolder(false);
      await loadBase();
      if (created?.id) {
        setSelectedFolderId(created.id);
        loadAssets(created.id);
      }
      toast.success('Folder attached');
    } catch {
      toast.error('Failed to attach folder');
    } finally {
      setSavingFolder(false);
    }
  };

  const uploadAssets = async (files) => {
    if (!selectedFolder) { toast.error('Attach a folder first'); return; }
    if (selectedFolder.externalUrl) {
      toast.error('This folder links to an external source — upload photos locally instead.');
      return;
    }
    setUploading(true);
    try {
      const newAssets = [];
      for (const file of Array.from(files || [])) {
        const ext = file.name.split('.').pop() || 'bin';
        const safeName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'asset';
        const path = `clients/${clientId}/${selectedFolder.id}/${Date.now()}-${safeName}.${ext}`;
        const fileUrl = await uploadFile(path, file);
        const { width, height } = await getImageDimensions(file);
        const { score, flags } = inferAssetScore(width, height, file);
        const row = await supabaseService.createClientAsset({
          clientId,
          folderId: selectedFolder.id,
          listingId: selectedFolder.listingId || null,
          fileName: file.name,
          filePath: path,
          fileUrl,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
          width,
          height,
          aiScore: score,
          scoreFlags: flags,
        });
        if (row) newAssets.push(row);
      }
      await loadAssets(selectedFolder.id);
      toast.success(`${newAssets.length} asset${newAssets.length === 1 ? '' : 's'} uploaded`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const rankWithAI = async () => {
    const imageAssets = sortedAssets.filter((a) => a.mediaType === 'image' && a.fileUrl);
    if (!imageAssets.length) { toast.error('No images to rank'); return; }
    setRankingPhotos(true);
    try {
      const payload = imageAssets.map((a) => ({ id: a.id, url: a.fileUrl }));
      const results = await openaiService.rankListingPhotos(payload);
      // Apply scores returned from the API
      const updatedAssets = sortedAssets.map((asset) => {
        const ranked = results.find((r) => r.id === asset.id);
        if (!ranked) return asset;
        return { ...asset, aiScore: ranked.score, aiRationale: ranked.rationale, scoreFlags: { ...asset.scoreFlags } };
      });
      // Auto-mark top 10 as top picks and selected
      const sorted = [...updatedAssets].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
      const topIds = new Set(sorted.slice(0, 10).map((a) => a.id));
      // Persist to DB
      await Promise.all(
        sorted.map((a) =>
          supabaseService.updateClientAsset(a.id, {
            aiScore: a.aiScore,
            aiRationale: a.aiRationale,
            isTopPick: topIds.has(a.id),
            isSelected: topIds.has(a.id),
          })
        )
      );
      setSelectedAssetIds(topIds);
      await loadAssets(selectedFolder.id);
      toast.success(`Ranked ${imageAssets.length} photos — top ${Math.min(10, imageAssets.length)} selected`);
    } catch (err) {
      toast.error('AI ranking unavailable — edge function not deployed yet');
      console.warn('rankListingPhotos error:', err);
    } finally {
      setRankingPhotos(false);
    }
  };

  const generateCaption = async () => {
    const description = selectedListing?.description || '';
    if (!description.trim()) {
      toast.error('Add a listing description first');
      return;
    }
    setGeneratingCaption(true);
    try {
      const result = await openaiService.generateCaption({
        description,
        platform: captionPlatform,
        tone: 'luxury',
      });
      setGeneratedCaption(result?.caption || '');
      setGeneratedHashtags(Array.isArray(result?.hashtags) ? result.hashtags.join(' ') : '');
    } catch {
      toast.error('Caption generation failed');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error('Copy failed'));
  };

  const downloadSelected = () => {
    if (!selectedAssets.length) { toast.error('Select at least one asset first'); return; }
    selectedAssets.forEach((asset, i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = asset.fileUrl;
        link.download = asset.fileName || `asset-${i + 1}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      }, i * 300);
    });
    toast.success(`Downloading ${selectedAssets.length} asset${selectedAssets.length === 1 ? '' : 's'}…`);
  };

  const pushToCalendar = async () => {
    if (!generatedCaption.trim()) { toast.error('Generate a caption first'); return; }
    if (!scheduleDate) { toast.error('Pick a date for the calendar'); return; }
    setPushingToCalendar(true);
    try {
      await supabaseService.pushToContentCalendar({
        clientId,
        listingId: selectedListingId,
        platform: captionPlatform,
        caption: generatedCaption,
        hashtags: generatedHashtags,
        assetUrls: selectedAssets.map((a) => a.fileUrl),
        scheduledDate: scheduleDate,
      });
      toast.success('Added to content calendar!');
    } catch (err) {
      toast.error('Could not push to calendar — check table setup');
      console.error('pushToContentCalendar error:', err);
    } finally {
      setPushingToCalendar(false);
    }
  };

  const toggleAsset = (id) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const clientName     = client?.name || client?.client_name || 'Client Workspace';
  const clientBrokerage = client?.brokerage || '';
  const clientPhoto    = client?.logo_url || client?.profile_photo || null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-[1400px] mx-auto">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <button
          onClick={() => navigate('/my-clients')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.1] transition-colors shadow-sm flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> My Clients
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-[#86868b] flex-shrink-0" />
        {/* Client identity */}
        <div className="flex items-center gap-3 min-w-0">
          {clientPhoto ? (
            <img
              src={clientPhoto}
              alt={clientName}
              className="w-9 h-9 rounded-xl object-cover border border-black/[0.06] dark:border-white/[0.1] flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-bold text-[#0071e3]">{clientName.charAt(0)}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-tight truncate">
              {clientName}
            </h1>
            {clientBrokerage && (
              <p className="text-[11px] text-[#86868b] truncate">{clientBrokerage}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── LEFT RAIL ───────────────────────────────────────────────────── */}
        <aside className="w-[260px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">

          {/* Add Listing button */}
          <button
            onClick={() => setShowAddListing((v) => !v)}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-[#0071e3]/40 text-[#0071e3] text-[13px] font-semibold hover:bg-[#0071e3]/5 active:scale-[0.98] transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            {showAddListing ? 'Cancel' : 'Add Listing'}
          </button>

          {/* Add Listing form */}
          {showAddListing && (
            <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm p-4 space-y-2.5 flex-shrink-0">
              <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">New Listing</p>
              <input
                value={newListingUrl}
                onChange={(e) => setNewListingUrl(e.target.value)}
                placeholder="Zillow listing URL (best results) or any MLS link"
                className={INPUT}
              />
              <textarea
                value={newListingDesc}
                onChange={(e) => setNewListingDesc(e.target.value)}
                rows={2}
                placeholder="Description (used for AI captions)"
                className={TEXTAREA}
              />
              <textarea
                value={newListingNotes}
                onChange={(e) => setNewListingNotes(e.target.value)}
                rows={1}
                placeholder="Internal notes (optional)"
                className={TEXTAREA}
              />
              <button
                onClick={saveListing}
                disabled={!newListingUrl.trim() || savingListing}
                className={`w-full ${BTN_PRIMARY}`}
              >
                {savingListing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                {savingListing ? 'Saving…' : 'Save Listing'}
              </button>
            </div>
          )}

          {/* Listing cards */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="w-5 h-5 text-[#86868b] animate-spin" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Globe className="w-8 h-8 text-[#86868b] mb-2" />
              <p className="text-[13px] text-[#86868b]">No listings yet</p>
              <p className="text-[11px] text-[#86868b]/70 mt-1">Add a listing to get started</p>
            </div>
          ) : (
            listings.map((listing) => {
              const active = selectedListingId === listing.id;
              const status = listingStatuses[listing.id] || 'needs_folder';
              const isScraping = scrapingIds.has(listing.id);
              return (
                <button
                  key={listing.id}
                  onClick={() => {
                    setSelectedListingId(listing.id);
                    setActiveTab('assets');
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                    active
                      ? 'bg-[#0071e3] border-[#0071e3] shadow-sm shadow-[#0071e3]/25'
                      : 'bg-white dark:bg-[#1c1c1e] border-black/[0.04] dark:border-white/[0.06] hover:border-black/[0.08] dark:hover:border-white/[0.1] shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${active ? 'bg-white/20' : 'bg-[#0071e3]/10'}`}>
                      {isScraping
                        ? <RefreshCw className={`w-4 h-4 animate-spin ${active ? 'text-white' : 'text-[#0071e3]'}`} />
                        : <Globe className={`w-4 h-4 ${active ? 'text-white' : 'text-[#0071e3]'}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold truncate leading-tight ${active ? 'text-white' : 'text-[#1d1d1f] dark:text-white'}`}>
                        {listing.title || listing.address || (isScraping ? 'Fetching details…' : 'Untitled Listing')}
                      </p>
                      {listing.address && listing.title && (
                        <p className={`text-[11px] truncate mt-0.5 ${active ? 'text-white/70' : 'text-[#86868b]'}`}>
                          {listing.address}
                        </p>
                      )}
                      {listing.price && (
                        <p className={`text-[11px] font-medium mt-0.5 ${active ? 'text-white/80' : 'text-[#34c759]'}`}>
                          {listing.price}
                        </p>
                      )}
                      <div className="mt-1.5">
                        {active ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            status === 'ready' ? 'bg-white/20 text-white' : 'bg-white/20 text-white/80'
                          }`}>
                            {status === 'ready' ? <><Check className="w-2.5 h-2.5" /> Ready</> :
                             status === 'needs_assets' ? <><ImageIcon className="w-2.5 h-2.5" /> No Assets</> :
                             <><AlertCircle className="w-2.5 h-2.5" /> Needs Folder</>}
                          </span>
                        ) : (
                          <StatusChip status={status} />
                        )}
                      </div>
                    </div>
                  </div>
                  {listing.listingUrl && (
                    <a
                      href={listing.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-2 inline-flex items-center gap-1 text-[11px] ${active ? 'text-white/60 hover:text-white/90' : 'text-[#86868b] hover:text-[#0071e3]'} transition-colors`}
                    >
                      <ExternalLink className="w-3 h-3" /> View listing
                    </a>
                  )}
                </button>
              );
            })
          )}
        </aside>

        {/* ── MAIN PANE ───────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {!selectedListing ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Globe className="w-14 h-14 text-[#86868b]/40 mb-4" />
              <p className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
                Select a listing
              </p>
              <p className="text-[13px] text-[#86868b]">
                Choose a listing from the left rail to manage its workspace.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* ── Listing context bar ──────────────────────────────── */}
              <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm px-5 py-3.5 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h2 className="text-[16px] font-bold text-[#1d1d1f] dark:text-white truncate">
                    {selectedListing.title || selectedListing.address || 'Untitled Listing'}
                  </h2>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {selectedListing.address && selectedListing.title && (
                      <span className="text-[12px] text-[#86868b]">{selectedListing.address}</span>
                    )}
                    {selectedListing.price && (
                      <span className="text-[12px] font-semibold text-[#34c759]">{selectedListing.price}</span>
                    )}
                    {selectedListing.beds && (
                      <span className="text-[12px] text-[#86868b]">{selectedListing.beds} bd · {selectedListing.baths} ba</span>
                    )}
                  </div>
                </div>
                {selectedListing.listingUrl && (
                  <a
                    href={selectedListing.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3]/8 text-[#0071e3] text-[12px] font-medium hover:bg-[#0071e3]/15 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </a>
                )}
              </div>

              {/* ── Tabs ────────────────────────────────────────────── */}
              <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-white/[0.05] p-1 rounded-xl w-fit">
                {[
                  { id: 'assets',  label: 'Assets',          icon: <ImageIcon className="w-3.5 h-3.5" /> },
                  { id: 'caption', label: 'Caption',          icon: <Sparkles  className="w-3.5 h-3.5" /> },
                  { id: 'export',  label: 'Schedule & Export', icon: <Calendar  className="w-3.5 h-3.5" /> },
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                      activeTab === id
                        ? 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-white shadow-sm'
                        : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* ══ ASSETS TAB ══════════════════════════════════════════ */}
              {activeTab === 'assets' && (
                <div className="space-y-4">

                  {/* Folder panel */}
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-[#ff9500]" />
                        <span className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                          Asset Folder
                        </span>
                      </div>
                      {listingFolders.length === 0 ? (
                        <button
                          onClick={() => setShowAttachFolder((v) => !v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-[12px] font-semibold hover:bg-[#0077ed] transition-colors active:scale-[0.98]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Attach Folder
                        </button>
                      ) : (
                        <span className="text-[12px] text-[#86868b]">
                          {listingFolders.length} folder{listingFolders.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Attach folder form */}
                    {showAttachFolder && (
                      <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06] space-y-3 bg-[#f5f5f7]/50 dark:bg-white/[0.02]">
                        <p className="text-[12px] text-[#86868b]">
                          Paste a Google Drive or Dropbox share link, or leave blank to upload photos directly.
                        </p>
                        <input
                          value={folderName}
                          onChange={(e) => setFolderName(e.target.value)}
                          placeholder="Folder name (e.g. 123 Main St Photos)"
                          className={INPUT}
                        />
                        <input
                          value={folderExternalUrl}
                          onChange={(e) => setFolderExternalUrl(e.target.value)}
                          placeholder="Google Drive or Dropbox link (optional)"
                          className={INPUT}
                        />
                        {folderExternalUrl && (
                          <p className={`text-[11px] font-medium ${folderSourceColor(detectFolderSource(folderExternalUrl))}`}>
                            Detected: {folderSourceLabel(detectFolderSource(folderExternalUrl))}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={attachFolder}
                            disabled={!folderName.trim() || savingFolder}
                            className={`flex-1 ${BTN_PRIMARY}`}
                          >
                            {savingFolder ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                            {savingFolder ? 'Saving…' : 'Attach'}
                          </button>
                          <button
                            onClick={() => { setShowAttachFolder(false); setFolderName(''); setFolderExternalUrl(''); }}
                            className={BTN_GHOST}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Folder selector (if multiple) */}
                    {listingFolders.length > 1 && (
                      <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-black/[0.04] dark:border-white/[0.06]">
                        {listingFolders.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => { setSelectedFolderId(f.id); loadAssets(f.id); }}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all ${
                              selectedFolder?.id === f.id
                                ? 'bg-[#0071e3] text-white'
                                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b] hover:text-[#1d1d1f]'
                            }`}
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Folder info or empty */}
                    {listingFolders.length === 0 && !showAttachFolder ? (
                      <div className="px-5 py-8 flex flex-col items-center text-center">
                        <FolderOpen className="w-10 h-10 text-[#86868b]/40 mb-3" />
                        <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-1">No folder attached</p>
                        <p className="text-[12px] text-[#86868b] max-w-[280px]">
                          Attach a Google Drive or Dropbox folder, or create an upload folder to store photos.
                        </p>
                      </div>
                    ) : selectedFolder ? (
                      <div className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{selectedFolder.name}</span>
                          <span className={`ml-2 text-[11px] font-medium ${folderSourceColor(selectedFolder.folderSource)}`}>
                            {folderSourceLabel(selectedFolder.folderSource)}
                          </span>
                        </div>
                        {selectedFolder.externalUrl && (
                          <a
                            href={selectedFolder.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] text-[#0071e3] hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open
                          </a>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Asset gallery */}
                  {selectedFolder && (
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
                      {/* Gallery toolbar */}
                      <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ImageIcon className="w-4 h-4 text-[#34c759]" />
                          <span className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                            Photos
                          </span>
                          <span className="text-[11px] text-[#86868b] bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                            {allAssets.length}
                          </span>
                          {selectedAssetIds.size > 0 && (
                            <span className="text-[11px] text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full">
                              {selectedAssetIds.size} selected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {allAssets.some((a) => a.mediaType === 'image') && (
                            <button
                              onClick={rankWithAI}
                              disabled={rankingPhotos}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[12px] font-semibold hover:bg-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                              {rankingPhotos ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              {rankingPhotos ? 'Ranking…' : 'Rank with AI'}
                            </button>
                          )}
                          {!selectedFolder.externalUrl && (
                            <label className={`cursor-pointer ${BTN_PRIMARY}`} style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}>
                              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              {uploading ? 'Uploading…' : 'Upload'}
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => uploadAssets(e.target.files)}
                                disabled={uploading}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Drop zone + grid */}
                      <div
                        ref={dropRef}
                        onDragOver={(e) => { e.preventDefault(); if (!selectedFolder.externalUrl) setDropActive(true); }}
                        onDragLeave={() => setDropActive(false)}
                        onDrop={(e) => { e.preventDefault(); setDropActive(false); if (!selectedFolder.externalUrl) uploadAssets(e.dataTransfer.files); }}
                        className="p-5"
                      >
                        {allAssets.length === 0 ? (
                          <div className={`flex flex-col items-center justify-center py-14 rounded-2xl border-2 border-dashed transition-colors ${
                            dropActive ? 'border-[#0071e3] bg-[#0071e3]/5' : 'border-black/[0.06] dark:border-white/[0.08]'
                          }`}>
                            {selectedFolder.externalUrl ? (
                              <>
                                <ExternalLink className="w-10 h-10 text-[#86868b]/40 mb-3" />
                                <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-1">External folder</p>
                                <p className="text-[12px] text-[#86868b] mb-3">
                                  Photos are stored in {folderSourceLabel(selectedFolder.folderSource)}
                                </p>
                                <a
                                  href={selectedFolder.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={BTN_PRIMARY}
                                  style={{ height: '36px', fontSize: '12px' }}
                                >
                                  <ExternalLink className="w-4 h-4" /> Open in {folderSourceLabel(selectedFolder.folderSource)}
                                </a>
                              </>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 text-[#86868b]/40 mb-3" />
                                <p className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
                                  Drop photos here
                                </p>
                                <p className="text-[12px] text-[#86868b]">or click Upload above</p>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {sortedAssets.map((asset, idx) => {
                              const isSelected = selectedAssetIds.has(asset.id);
                              const isTopPick = asset.isTopPick || idx < 10;
                              return (
                                <div
                                  key={asset.id}
                                  onClick={() => toggleAsset(asset.id)}
                                  className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all ${
                                    isSelected
                                      ? 'ring-2 ring-[#0071e3] shadow-lg shadow-[#0071e3]/20 scale-[1.02]'
                                      : 'hover:scale-[1.02] hover:shadow-md'
                                  }`}
                                >
                                  <div className="relative aspect-square bg-[#f5f5f7] dark:bg-white/[0.04]">
                                    {asset.mediaType === 'video' ? (
                                      <video src={asset.fileUrl} className="w-full h-full object-cover" muted />
                                    ) : (
                                      <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" loading="lazy" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Score badge */}
                                    <div className="absolute top-2 left-2">
                                      <ScoreBadge score={asset.aiScore} />
                                    </div>

                                    {/* Top pick star */}
                                    {isTopPick && (
                                      <div className="absolute top-2 right-2">
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ff9500] text-white text-[9px] font-bold shadow-sm">
                                          <Star className="w-2.5 h-2.5 fill-white" /> Top
                                        </span>
                                      </div>
                                    )}

                                    {/* Selection check */}
                                    <div className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                                      isSelected ? 'bg-[#0071e3] opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'
                                    }`} style={{ top: isTopPick ? 'auto' : '8px', bottom: isTopPick ? 'auto' : 'auto' }}>
                                      {isSelected && <Check className="w-3 h-3 text-white" />}
                                    </div>

                                    {/* Hover info */}
                                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <p className="text-[10px] text-white font-medium truncate drop-shadow-sm">{asset.fileName}</p>
                                      {asset.width && asset.height && (
                                        <p className="text-[9px] text-white/70 mt-0.5">{asset.width}×{asset.height}</p>
                                      )}
                                      {asset.aiRationale && (
                                        <p className="text-[9px] text-white/80 mt-0.5 line-clamp-2">{asset.aiRationale}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ CAPTION TAB ═════════════════════════════════════════ */}
              {activeTab === 'caption' && (
                <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Caption Generator</span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Platform switcher */}
                    <div>
                      <p className="text-[12px] font-semibold text-[#86868b] mb-2 uppercase tracking-wide">Platform</p>
                      <div className="flex gap-2">
                        {[
                          { id: 'instagram', label: 'Instagram' },
                          { id: 'facebook',  label: 'Facebook'  },
                          { id: 'linkedin',  label: 'LinkedIn'  },
                        ].map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => setCaptionPlatform(id)}
                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all active:scale-[0.97] ${
                              captionPlatform === id
                                ? 'bg-[#0071e3] text-white shadow-sm shadow-[#0071e3]/20'
                                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Listing description preview */}
                    {selectedListing?.description ? (
                      <div className="p-3 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
                        <p className="text-[11px] font-semibold text-[#86868b] mb-1 uppercase tracking-wide">Source: Listing Description</p>
                        <p className="text-[13px] text-[#1d1d1f] dark:text-white/80 line-clamp-3">{selectedListing.description}</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#ff9500]/8 border border-[#ff9500]/20">
                        <p className="text-[12px] text-[#ff9500]">
                          <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                          No description on this listing — add one when saving for better caption quality.
                        </p>
                      </div>
                    )}

                    {/* Generate button */}
                    <button
                      onClick={generateCaption}
                      disabled={generatingCaption}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-purple-500/20"
                    >
                      {generatingCaption ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {generatingCaption ? 'Generating…' : `Generate ${captionPlatform.charAt(0).toUpperCase() + captionPlatform.slice(1)} Caption`}
                    </button>

                    {/* Caption output */}
                    <div className="space-y-3">
                      <div className="relative">
                        <textarea
                          value={generatedCaption}
                          onChange={(e) => setGeneratedCaption(e.target.value)}
                          rows={6}
                          placeholder="Caption will appear here — or type your own…"
                          className={TEXTAREA}
                        />
                        {generatedCaption && (
                          <>
                            <span className="absolute bottom-3 left-3 text-[10px] text-[#86868b]">
                              {generatedCaption.length} chars
                            </span>
                            <button
                              onClick={() => copyToClipboard(generatedCaption, 'Caption')}
                              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] transition-colors"
                              title="Copy"
                            >
                              <Copy className="w-3.5 h-3.5 text-[#86868b]" />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute left-3 top-3 pointer-events-none">
                          <Hash className="w-3.5 h-3.5 text-[#86868b]" />
                        </div>
                        <textarea
                          value={generatedHashtags}
                          onChange={(e) => setGeneratedHashtags(e.target.value)}
                          rows={3}
                          placeholder="Hashtags…"
                          className={`${TEXTAREA} pl-8`}
                        />
                        {generatedHashtags && (
                          <button
                            onClick={() => copyToClipboard(generatedHashtags, 'Hashtags')}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/[0.06] dark:bg-white/[0.1] hover:bg-black/[0.1] dark:hover:bg-white/[0.15] transition-colors"
                            title="Copy hashtags"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#86868b]" />
                          </button>
                        )}
                      </div>

                      {generatedCaption && (
                        <button
                          onClick={() => copyToClipboard(
                            generatedHashtags ? `${generatedCaption}\n\n${generatedHashtags}` : generatedCaption,
                            'Full post'
                          )}
                          className={`w-full ${BTN_GHOST}`}
                        >
                          <Copy className="w-4 h-4" /> Copy Full Post
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ SCHEDULE & EXPORT TAB ══════════════════════════════ */}
              {activeTab === 'export' && (
                <div className="space-y-4">

                  {/* Selected assets summary */}
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Selected Assets</h3>
                        <p className="text-[12px] text-[#86868b] mt-0.5">
                          {selectedAssetIds.size} of {allAssets.length} photos selected
                        </p>
                      </div>
                      {selectedAssets.length > 0 && (
                        <button
                          onClick={downloadSelected}
                          className={BTN_PRIMARY}
                        >
                          <Download className="w-4 h-4" />
                          Download {selectedAssets.length} Photo{selectedAssets.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>

                    {/* Mini gallery of selected */}
                    {selectedAssets.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {selectedAssets.slice(0, 12).map((asset) => (
                          <div
                            key={asset.id}
                            className="w-14 h-14 rounded-xl overflow-hidden border border-[#0071e3]/30 relative group"
                          >
                            <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" />
                            <button
                              onClick={() => toggleAsset(asset.id)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ))}
                        {selectedAssets.length > 12 && (
                          <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] flex items-center justify-center border border-black/[0.04] dark:border-white/[0.06]">
                            <span className="text-[12px] font-semibold text-[#86868b]">+{selectedAssets.length - 12}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04]">
                        <AlertCircle className="w-5 h-5 text-[#86868b]" />
                        <p className="text-[13px] text-[#86868b]">
                          Go to the Assets tab and click photos to select them.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Calendar push */}
                  <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#0071e3]" />
                      <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Push to Content Calendar</h3>
                    </div>

                    {/* Caption preview */}
                    {generatedCaption ? (
                      <div className="p-3 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
                        <p className="text-[11px] font-semibold text-[#86868b] mb-1 uppercase tracking-wide">Caption Preview</p>
                        <p className="text-[13px] text-[#1d1d1f] dark:text-white/80 line-clamp-3">{generatedCaption}</p>
                        <button
                          onClick={() => setActiveTab('caption')}
                          className="mt-2 text-[11px] text-[#0071e3] hover:underline"
                        >
                          Edit in Caption tab →
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#ff9500]/8 border border-[#ff9500]/20">
                        <p className="text-[12px] text-[#ff9500]">
                          <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                          No caption yet —{' '}
                          <button onClick={() => setActiveTab('caption')} className="underline font-medium">
                            generate one first
                          </button>
                        </p>
                      </div>
                    )}

                    {/* Platform + date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868b] mb-1.5 uppercase tracking-wide">Platform</label>
                        <select
                          value={captionPlatform}
                          onChange={(e) => setCaptionPlatform(e.target.value)}
                          className={INPUT}
                        >
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="linkedin">LinkedIn</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-[#86868b] mb-1.5 uppercase tracking-wide">Schedule Date</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          className={INPUT}
                        />
                      </div>
                    </div>

                    <button
                      onClick={pushToCalendar}
                      disabled={pushingToCalendar || !generatedCaption.trim() || !scheduleDate}
                      className={`w-full ${BTN_PRIMARY}`}
                    >
                      {pushingToCalendar ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                      {pushingToCalendar ? 'Pushing…' : 'Add to Calendar'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
