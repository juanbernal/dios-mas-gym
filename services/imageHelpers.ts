/**
 * Centralized utility to upgrade external cover/image URLs to their highest resolution versions.
 */
export const getHighResUrl = (url: string | null): string => {
  if (!url) return "";
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  let upgradedUrl = url.trim();
  
  try {
    // 1. YouTube Video Thumbnails
    // Low-res: default.jpg, mqdefault.jpg, hqdefault.jpg
    // High-res master: maxresdefault.jpg (1280x720). Upgrades automatically!
    if (upgradedUrl.includes('img.youtube.com/vi/') || upgradedUrl.includes('i.ytimg.com/vi/')) {
        upgradedUrl = upgradedUrl.replace(/\/(default|hqdefault|mqdefault|sddefault)\.jpg/g, '/maxresdefault.jpg');
    }

    // 2. Spotify CDN covers (Album art, Artist profiles, Playlists)
    // Handles i.scdn.co/image/ and *.spotifycdn.com
    // Supports ab67616d0000 (Album covers -> b273) and ab6761610000 (Avatars -> e5eb) without truncating the unique ID!
    if (upgradedUrl.includes('i.scdn.co/image/') || upgradedUrl.includes('spotifycdn.com')) {
        if (upgradedUrl.includes('ab67616d0000')) {
            upgradedUrl = upgradedUrl.replace(/ab67616d0000[0-9a-fA-F]{4}/g, 'ab67616d0000b273');
        } else if (upgradedUrl.includes('ab6761610000')) {
            upgradedUrl = upgradedUrl.replace(/ab6761610000[0-9a-fA-F]{4}/g, 'ab6761610000e5eb');
        }
    }

    // 3. Blogger, Blogspot, Google Photos, and Picasa Web Albums path resizing (e.g. /s320/, /s220-c/, /w200-h200/)
    // Replaces the path sizing segment directly with /s0/ to request the original high-resolution master asset
    if (upgradedUrl.includes('googleusercontent.com') || upgradedUrl.includes('blogspot.com') || upgradedUrl.includes('bp.blogspot.com') || upgradedUrl.includes('ggpht.com')) {
        if (/\/s[0-9]+(-c)?\//.test(upgradedUrl) || /\/[sw][0-9]+(-[sw][0-9]+)?(-c)?\//.test(upgradedUrl)) {
            upgradedUrl = upgradedUrl.replace(/\/[sw][0-9]+(-[sw][0-9]+)?(-c)?\//g, '/s0/');
        }
    }

    // 4. Google User Content query parameters resizing (e.g. =w220, =s220 at the end)
    // Only applied to googleusercontent.com domains to avoid mangling drive.google.com direct file ID parameters!
    if (upgradedUrl.includes('googleusercontent.com') && upgradedUrl.includes('=')) {
        const base = upgradedUrl.split('=')[0];
        upgradedUrl = `${base}=s0`; // Fetch pristine uncompressed original master asset
    }

    // 5. Google Drive direct thumbnail URLs
    if (upgradedUrl.includes('drive.google.com/thumbnail') || upgradedUrl.includes('drive.google.com/depot')) {
        if (upgradedUrl.includes('sz=')) {
            upgradedUrl = upgradedUrl.replace(/sz=\w+/g, 'sz=s2000');
        } else {
            upgradedUrl = `${upgradedUrl}${upgradedUrl.includes('?') ? '&' : '?'}sz=s2000`;
        }
    } else if (upgradedUrl.includes('drive.google.com')) {
        if (upgradedUrl.includes('/thumbnail')) {
            upgradedUrl = upgradedUrl.replace('/thumbnail', '/uc') + '&export=download';
        } else if (upgradedUrl.includes('/file/d/')) {
            const fileId = upgradedUrl.split('/file/d/')[1]?.split('/')[0];
            if (fileId) {
                upgradedUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
            }
        }
    }
  } catch (e) {
    console.warn("[imageHelpers] URL Upgrade failed, using fallback:", url, e);
  }
  
  return upgradedUrl;
};

/**
 * Returns a CORS-safe URL using our local/production proxy
 * to prevent tainted canvas errors when downloading images.
 * Adds a light cache-busting timestamp to bypass browser cache conflicts.
 */
export const getCorsFriendlyUrl = (url: string | null): string => {
  if (!url) return "";
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return url;
  }
  
  const upgradedUrl = getHighResUrl(url);
  
  // Clean trailing hash or params if needed, then append cache-buster to bypass browser cache poison
  // (Prevents browser from reusing cached responses loaded without CORS headers)
  const cacheBuster = `t_cors=${new Date().getTime()}`;
  const separator = upgradedUrl.includes('?') ? '&' : '?';
  const finalUrl = `${upgradedUrl}${separator}${cacheBuster}`;
  
  return `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
};
