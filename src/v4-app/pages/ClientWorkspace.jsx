import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FolderPlus, Link as LinkIcon, Sparkles, Upload } from 'lucide-react';
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
  if (!width || !height) {
    score -= 20;
    flags.noDimensions = true;
  }
  if (width && height && Math.min(width, height) < 1080) {
    score -= 25;
    flags.lowResolution = true;
  }
  if (width && height && width > height * 1.9) {
    score -= 15;
    flags.ultraWide = true;
  }
  if (file?.size && file.size > 8 * 1024 * 1024) {
    score -= 10;
    flags.largeFile = true;
  }
  if (width && height) {
    flags.orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square';
  }
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

export default function ClientWorkspace() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [folders, setFolders] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [assets, setAssets] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderListingId, setNewFolderListingId] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState('');

  const selectedFolder = useMemo(() => folders.find((f) => f.id === selectedFolderId) || null, [folders, selectedFolderId]);

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
    if (!folderId) {
      setAssets([]);
      return;
    }
    const rows = await supabaseService.getClientAssets(folderId);
    setAssets(rows || []);
  };

  useEffect(() => { loadBase(); }, [clientId]);
  useEffect(() => { loadAssets(selectedFolderId); }, [selectedFolderId]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await supabaseService.createClientAssetFolder({
      clientId,
      listingId: newFolderListingId || null,
      name: newFolderName.trim(),
    });
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
    } catch {
      // Non-fatal fallback: AM can still save manual data.
    }
    await supabaseService.createClientListing({
      clientId,
      listingUrl: listingUrl.trim(),
      sourceDomain: scraped.sourceDomain || '',
      title: scraped.title || '',
      description: listingDescription.trim() || scraped.description || '',
      rawPayload: scraped || {},
    });
    setListingUrl('');
    setListingDescription('');
    await loadBase();
    toast.success('Listing saved');
  };

  const uploadAssets = async (files) => {
    if (!selectedFolder) {
      toast.error('Select a folder first');
      return;
    }
    for (const file of Array.from(files || [])) {
      const ext = file.name.split('.').pop() || 'bin';
      const safeName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'asset';
      const path = `clients/${clientId}/${selectedFolder.id}/${Date.now()}-${safeName}.${ext}`;
      const fileUrl = await uploadFile(path, file);
      const { width, height } = await getImageDimensions(file);
      const { score, flags } = inferAssetScore(width, height, file);
      await supabaseService.createClientAsset({
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
    }
    await loadAssets(selectedFolder.id);
    toast.success('Assets uploaded');
  };

  const generateCaption = async () => {
    const listing = listings.find((l) => l.id === newFolderListingId) || listings[0];
    const description = listing?.description || listingDescription;
    if (!description?.trim()) {
      toast.error('Add or select listing details first');
      return;
    }
    setGeneratingCaption(true);
    try {
      const result = await openaiService.generateCaption({
        description,
        platform: 'instagram',
        tone: 'luxury',
      });
      const hashtags = Array.isArray(result?.hashtags) ? result.hashtags : [];
      setGeneratedCaption(result?.caption || '');
      setGeneratedHashtags(hashtags.join(' '));
    } finally {
      setGeneratingCaption(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/v4/my-clients')} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[13px]">
          <ArrowLeft className="w-4 h-4" /> Back to My Clients
        </button>
        <h1 className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">
          {client?.name || client?.client_name || 'Client Workspace'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-2xl border border-black/5 dark:border-white/10 p-4 space-y-3">
          <h2 className="text-[14px] font-semibold">Listings</h2>
          <input value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="Paste listing URL" className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/10 text-[13px]" />
          <textarea value={listingDescription} onChange={(e) => setListingDescription(e.target.value)} rows={3} placeholder="Optional description override" className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[13px]" />
          <button onClick={saveListing} className="w-full h-10 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium inline-flex items-center justify-center gap-2">
            <LinkIcon className="w-4 h-4" /> Save Listing Link
          </button>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {listings.map((listing) => (
              <div key={listing.id} className="p-2 rounded-lg bg-black/5 dark:bg-white/10 text-[12px]">
                <p className="font-medium truncate">{listing.title || listing.listingUrl}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-black/5 dark:border-white/10 p-4 space-y-3">
          <h2 className="text-[14px] font-semibold">Asset Folders</h2>
          <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name" className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/10 text-[13px]" />
          <select value={newFolderListingId} onChange={(e) => setNewFolderListingId(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/10 text-[13px]">
            <option value="">No listing attached</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title || l.listingUrl}</option>)}
          </select>
          <button onClick={createFolder} className="w-full h-10 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium inline-flex items-center justify-center gap-2">
            <FolderPlus className="w-4 h-4" /> Create Folder
          </button>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {folders.map((folder) => (
              <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`w-full text-left p-2 rounded-lg text-[12px] ${selectedFolderId === folder.id ? 'bg-[#0071e3]/15 text-[#0071e3]' : 'bg-black/5 dark:bg-white/10'}`}>
                {folder.name}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-black/5 dark:border-white/10 p-4 space-y-3">
          <h2 className="text-[14px] font-semibold">Caption Generator</h2>
          <button onClick={generateCaption} disabled={generatingCaption} className="w-full h-10 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[13px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60">
            <Sparkles className="w-4 h-4" /> {generatingCaption ? 'Generating...' : 'Generate Instagram Caption'}
          </button>
          <textarea value={generatedCaption} onChange={(e) => setGeneratedCaption(e.target.value)} rows={5} placeholder="Generated caption appears here" className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[13px]" />
          <textarea value={generatedHashtags} onChange={(e) => setGeneratedHashtags(e.target.value)} rows={3} placeholder="#hashtags" className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[13px]" />
        </section>
      </div>

      <section className="rounded-2xl border border-black/5 dark:border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-semibold">{selectedFolder ? `${selectedFolder.name} Assets` : 'Assets'}</h2>
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] cursor-pointer">
            <Upload className="w-4 h-4" /> Upload
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => uploadAssets(e.target.files)} />
          </label>
        </div>
        {assets.length === 0 ? (
          <p className="text-[13px] text-[#86868b]">No assets uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-xl overflow-hidden border border-black/5 dark:border-white/10">
                {asset.mediaType === 'video' ? (
                  <video src={asset.fileUrl} className="w-full aspect-square object-cover" muted />
                ) : (
                  <img src={asset.fileUrl} alt={asset.fileName} className="w-full aspect-square object-cover" />
                )}
                <div className="p-2 text-[11px]">
                  <p className="truncate">{asset.fileName}</p>
                  <p className="text-[#0071e3] font-medium">Score: {asset.aiScore}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
