import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Copy, ExternalLink, FolderPlus,
  Globe, Hash, Image as ImageIcon, Link as LinkIcon, RefreshCw,
  Sparkles, Star, Upload, Video
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../../services/supabaseService';
import { uploadFile } from '../../services/storageService';
import { openaiService } from '../services/openaiService';

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

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'bg-[#34c759]/15 text-[#34c759]' : score >= 50 ? 'bg-[#ff9500]/15 text-[#ff9500]' : 'bg-[#ff3b30]/15 text-[#ff3b30]';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
      <Star className="w-3 h-3" />
      {score}
    </span>
  );
}

const INPUT = 'w-full h-11 px-4 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 transition-all';
const TEXTAREA = 'w-full px-4 py-3 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 resize-none transition-all';

export default function ClientWorkspace() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const dropRef = useRef(null);
  const [client, setClient] = useState(null);
  const [folders, setFolders] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderListingId, setNewFolderListingId] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState('');

  const selectedFolder = useMemo(() => folders.find((f) => f.id === selectedFolderId) || null, [folders, selectedFolderId]);
  const sortedAssets = useMemo(() => [...assets].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)), [assets]);

  const loadBase = async () => {
    if (!clientId) return;
    const [{ data: clientRow }, folderRows, listingRows] = await Promise.all([
      supabase.from('clients').select('id, name, client_name').eq('id', clientId).maybeSingle(),
      supabaseService.getClientAssetFolders(clientId),
      supabaseService.getClientListings(clientId),
    ]);
    setClient(clientRow || null);
    setFolders(folderRows || []);
    setListings(listingRows || []);
    if (!selectedFolderId && folderRows?.length) setSelectedFolderId(folderRows[0].id);
  };

  const loadAssets = async (folderId) => {
    if (!folderId) { setAssets([]); return; }
    const rows = await supabaseService.getClientAssets(folderId);
    setAssets(rows || []);
  };

  useEffect(() => { loadBase(); }, [clientId]);
  useEffect(() => { loadAssets(selectedFolderId); }, [selectedFolderId]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await supabaseService.createClientAssetFolder({ clientId, listingId: newFolderListingId || null, name: newFolderName.trim() });
    setNewFolderName('');
    setNewFolderListingId('');
    await loadBase();
    toast.success('Asset folder created');
  };

  const saveListing = async () => {
    if (!listingUrl.trim()) return;
    let scraped = {};
    try {
      const res = await fetch(`/api/scrape-listing?url=${encodeURIComponent(listingUrl.trim())}`);
      if (res.ok) scraped = await res.json();
    } catch { /* non-fatal */ }
    await supabaseService.createClientListing({
      clientId, listingUrl: listingUrl.trim(), sourceDomain: scraped.sourceDomain || '',
      title: scraped.title || '', description: listingDescription.trim() || scraped.description || '', rawPayload: scraped || {},
    });
    setListingUrl('');
    setListingDescription('');
    await loadBase();
    toast.success('Listing saved');
  };

  const uploadAssets = async (files) => {
    if (!selectedFolder) { toast.error('Select a folder first'); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files || [])) {
        const ext = file.name.split('.').pop() || 'bin';
        const safeName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'asset';
        const path = `clients/${clientId}/${selectedFolder.id}/${Date.now()}-${safeName}.${ext}`;
        const fileUrl = await uploadFile(path, file);
        const { width, height } = await getImageDimensions(file);
        const { score, flags } = inferAssetScore(width, height, file);
        await supabaseService.createClientAsset({
          clientId, folderId: selectedFolder.id, listingId: selectedFolder.listingId || null,
          fileName: file.name, filePath: path, fileUrl,
          mediaType: file.type.startsWith('video/') ? 'video' : 'image', width, height, aiScore: score, scoreFlags: flags,
        });
      }
      await loadAssets(selectedFolder.id);
      toast.success('Assets uploaded');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateCaption = async () => {
    const listing = listings.find((l) => l.id === newFolderListingId) || listings[0];
    const description = listing?.description || listingDescription;
    if (!description?.trim()) { toast.error('Add or select listing details first'); return; }
    setGeneratingCaption(true);
    try {
      const result = await openaiService.generateCaption({ description, platform: 'instagram', tone: 'luxury' });
      setGeneratedCaption(result?.caption || '');
      setGeneratedHashtags(Array.isArray(result?.hashtags) ? result.hashtags.join(' ') : '');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => toast.error('Copy failed'));
  };

  const clientName = client?.name || client?.client_name || 'Client Workspace';

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate('/my-clients')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.1] transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4" /> My Clients
          </button>
          <ChevronRight className="w-4 h-4 text-[#86868b] flex-shrink-0" />
          <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f] dark:text-white truncate">{clientName}</h1>
        </div>
      </div>

      {/* ── Top 3-col grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Listings ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#0071e3]" />
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Listings</h2>
              <span className="ml-auto text-[11px] font-medium text-[#86868b] bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{listings.length}</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <input value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="Paste listing URL (Zillow, Realtor, MLS…)" className={INPUT} />
            <textarea value={listingDescription} onChange={(e) => setListingDescription(e.target.value)} rows={2} placeholder="Description override (optional)" className={TEXTAREA} />
            <button onClick={saveListing} disabled={!listingUrl.trim()} className="w-full h-11 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#0077ed] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#0071e3]/20">
              <LinkIcon className="w-4 h-4" /> Save Listing
            </button>
          </div>
          {listings.length > 0 && (
            <div className="px-5 pb-5 space-y-2 max-h-56 overflow-y-auto">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f5f7] dark:bg-white/[0.04] group">
                  <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-[#0071e3]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">{listing.title || 'Untitled Listing'}</p>
                    <p className="text-[11px] text-[#86868b] truncate">{listing.listingUrl}</p>
                  </div>
                  <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all">
                    <ExternalLink className="w-3.5 h-3.5 text-[#86868b]" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Asset Folders ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#ff9500]" />
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Asset Folders</h2>
              <span className="ml-auto text-[11px] font-medium text-[#86868b] bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{folders.length}</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder name" className={INPUT} />
            <select value={newFolderListingId} onChange={(e) => setNewFolderListingId(e.target.value)} className={INPUT}>
              <option value="">Link to listing (optional)</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.title || l.listingUrl}</option>)}
            </select>
            <button onClick={createFolder} disabled={!newFolderName.trim()} className="w-full h-11 rounded-xl bg-[#ff9500]/10 text-[#ff9500] text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#ff9500]/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              <FolderPlus className="w-4 h-4" /> Create Folder
            </button>
          </div>
          {folders.length > 0 && (
            <div className="px-5 pb-5 space-y-1.5 max-h-56 overflow-y-auto">
              {folders.map((folder) => {
                const active = selectedFolderId === folder.id;
                return (
                  <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${active ? 'bg-[#0071e3] text-white shadow-sm shadow-[#0071e3]/25' : 'bg-[#f5f5f7] dark:bg-white/[0.04] text-[#1d1d1f] dark:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'bg-[#ff9500]/10'}`}>
                      <FolderPlus className={`w-4 h-4 ${active ? 'text-white' : 'text-[#ff9500]'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{folder.name}</p>
                      {folder.listing && <p className={`text-[11px] truncate ${active ? 'text-white/70' : 'text-[#86868b]'}`}>{folder.listing.title || 'Linked listing'}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Caption Generator ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Caption Generator</h2>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <button onClick={handleGenerateCaption} disabled={generatingCaption} className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-purple-500/20">
              {generatingCaption ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generatingCaption ? 'Generating…' : 'Generate Instagram Caption'}
            </button>

            <div className="relative">
              <textarea value={generatedCaption} onChange={(e) => setGeneratedCaption(e.target.value)} rows={5} placeholder="Caption will appear here…" className={TEXTAREA} />
              {generatedCaption && (
                <button onClick={() => copyToClipboard(generatedCaption, 'Caption')} className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors" title="Copy caption">
                  <Copy className="w-3.5 h-3.5 text-[#86868b]" />
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute left-4 top-3 pointer-events-none">
                <Hash className="w-3.5 h-3.5 text-[#86868b]" />
              </div>
              <textarea value={generatedHashtags} onChange={(e) => setGeneratedHashtags(e.target.value)} rows={3} placeholder="Hashtags will appear here…" className={`${TEXTAREA} pl-9`} />
              {generatedHashtags && (
                <button onClick={() => copyToClipboard(generatedHashtags, 'Hashtags')} className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors" title="Copy hashtags">
                  <Copy className="w-3.5 h-3.5 text-[#86868b]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Asset Gallery ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#34c759]" />
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{selectedFolder ? selectedFolder.name : 'Assets'}</h2>
            <span className="text-[11px] font-medium text-[#86868b] bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{assets.length}</span>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold cursor-pointer hover:bg-[#0077ed] active:scale-[0.98] transition-all shadow-sm shadow-[#0071e3]/20">
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload'}
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => uploadAssets(e.target.files)} disabled={uploading} />
          </label>
        </div>

        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => { e.preventDefault(); setDropActive(false); uploadAssets(e.dataTransfer.files); }}
          className="p-5"
        >
          {assets.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed transition-colors ${dropActive ? 'border-[#0071e3] bg-[#0071e3]/5' : 'border-black/[0.06] dark:border-white/[0.08]'}`}>
              <div className="w-16 h-16 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-[#86868b]" />
              </div>
              <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
                {selectedFolder ? 'Drop assets here' : 'Select a folder first'}
              </p>
              <p className="text-[13px] text-[#86868b]">
                {selectedFolder ? 'or click Upload above — images & videos supported' : 'Create or select a folder from the panel above'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {sortedAssets.map((asset, idx) => (
                <div key={asset.id} className="group relative rounded-2xl overflow-hidden bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] hover:shadow-lg hover:scale-[1.02] transition-all">
                  <div className="relative aspect-square">
                    {asset.mediaType === 'video' ? (
                      <video src={asset.fileUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 left-2">
                      <ScoreBadge score={asset.aiScore} />
                    </div>
                    {idx === 0 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#0071e3] text-white text-[9px] font-bold uppercase tracking-wide shadow-sm">
                        Top Pick
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[11px] text-white font-medium truncate drop-shadow-sm">{asset.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {asset.mediaType === 'video' ? <Video className="w-3 h-3 text-white/70" /> : <ImageIcon className="w-3 h-3 text-white/70" />}
                        {asset.width && asset.height && <span className="text-[10px] text-white/70">{asset.width}×{asset.height}</span>}
                        {asset.scoreFlags?.orientation && <span className="text-[10px] text-white/70 capitalize">{asset.scoreFlags.orientation}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
