import { NextRequest, NextResponse } from 'next/server';

/**
 * Resolves a Google Drive File ID to its final direct CDN stream URL.
 * Handles redirects and parses hidden form inputs (like confirm and uuid tokens) 
 * from the virus warning page for files of all sizes.
 */
async function getGoogleDriveStreamUrl(fileId: string): Promise<string> {
  let url = `https://docs.google.com/uc?export=download&id=${fileId}`;
  
  // Follow redirects/confirmations up to 5 times.
  for (let i = 0; i < 5; i++) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'manual',
      cache: 'no-store',
    });

    const location = response.headers.get('location');
    if (location) {
      url = location;
      continue;
    }

    if (response.status === 200) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const htmlText = await response.text();
        
        // Find all hidden inputs in the document
        const inputMatches = Array.from(htmlText.matchAll(/<input[^>]+type="hidden"[^>]+>/g));
        const formParams: Record<string, string> = {};
        
        for (const inputMatch of inputMatches) {
          const inputTag = inputMatch[0];
          const nameMatch = inputTag.match(/name="([^"]+)"/);
          const valueMatch = inputTag.match(/value="([^"]+)"/);
          if (nameMatch && valueMatch) {
            formParams[nameMatch[1]] = valueMatch[1];
          }
        }

        // If we found a confirmation form input, rebuild the query parameters and return immediately
        if (formParams.confirm) {
          if (!formParams.id) formParams.id = fileId;
          if (!formParams.export) formParams.export = 'download';
          
          const queryParams = new URLSearchParams(formParams).toString();
          const confirmedUrl = `https://drive.usercontent.google.com/download?${queryParams}`;
          return confirmedUrl;
        }
      } else {
        // If 200 OK and not HTML, cancel the body stream immediately to release the socket
        if (response.body) {
          await response.body.cancel().catch(() => {});
        }
      }
    }
    break;
  }
  return url;
}

function extractFileId(input: string): string {
  if (!input) return '';
  const fileDMatch = input.match(/\/file\/d\/([a-zA-Z0-9_\-]+)/);
  if (fileDMatch) return fileDMatch[1];
  const idParamMatch = input.match(/[?&]id=([a-zA-Z0-9_\-]+)/);
  if (idParamMatch) return idParamMatch[1];
  return input.trim();
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ fileId: string }> }
) {
  const params = await props.params;
  const rawFileId = params.fileId;
  const fileId = extractFileId(decodeURIComponent(rawFileId));

  if (!fileId) {
    return new NextResponse('File ID is required', { status: 400 });
  }

  try {
    // Resolve to the actual direct Google User Content CDN link
    const streamUrl = await getGoogleDriveStreamUrl(fileId);

    // Capture user's Range request headers
    const rangeHeader = request.headers.get('range');
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    // Perform actual stream request to the direct CDN url
    let streamResponse = await fetch(streamUrl, {
      method: 'GET',
      headers: fetchHeaders,
      cache: 'no-store',
    });

    // Extract streaming-related headers
    const headers = new Headers();
    const responseHeaders = streamResponse.headers;

    const contentType = responseHeaders.get('content-type') || 'video/mp4';

    if (contentType.includes('text/html')) {
      const htmlText = await streamResponse.text();
      if (htmlText.includes('Quota exceeded') || htmlText.includes('quota exceeded') || htmlText.includes('Sorry, you can\'t view or download this file')) {
        return new NextResponse(
          "Google Drive Quota Exceeded: Too many users have recently viewed or downloaded this file. Google Drive restricts high-traffic downloads. Please try again later, or download the movie directly.",
          { status: 429 }
        );
      }
      if (htmlText.includes('NotFound') || htmlText.includes('The page you requested was not found') || htmlText.includes('not found')) {
        return new NextResponse(
          "File not found on Google Drive. Please ensure the file ID is correct and is shared publicly.",
          { status: 404 }
        );
      }
      return new NextResponse(
        "Google Drive access denied. Ensure the file has link sharing turned on (Anyone with the link can view).",
        { status: 403 }
      );
    }

    const contentRange = responseHeaders.get('content-range');
    const contentLength = responseHeaders.get('content-length');
    const acceptRanges = responseHeaders.get('accept-ranges') || 'bytes';

    headers.set('Content-Type', contentType);
    headers.set('Accept-Ranges', acceptRanges);
    
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Set cache control for live streaming proxy
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Connection', 'keep-alive');

    // Return the readable stream directly to Next.js response
    return new NextResponse(streamResponse.body, {
      status: streamResponse.status,
      headers: headers,
    });
  } catch (error: any) {
    console.error('Google Drive streaming proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
