import { AxiosResponse } from "axios";
import { ApiInterface } from "../interface/api";

export const isBrowser = typeof window !== undefined;

export class LocalStorage {
  static get(key: string) {
    if (!isBrowser) return;
    const value = localStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  static set(key: string, value: any) {
    if (!isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  static remove(key: string) {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  }

  static clear() {
    if (!isBrowser) return;
    localStorage.clear();
  }
}

export const requestHandler = async (
  api: () => Promise<AxiosResponse<ApiInterface, any>>,
  setLoading: (loading: boolean) => void = () => {},
  onSuccess: (data: ApiInterface) => void,
  onError: (error: any) => void
) => {
  setLoading && setLoading(true);
  try {
    const response = await api();
    const { data } = response;
    if (data?.success) {
      // Call the onSuccess callback with the response data
      onSuccess(data);
    }
  } catch (error: any) {
    if ([401, 403].includes(error?.status)) {
      //clear localStorage on authentication issues
      LocalStorage.clear();
      if (isBrowser) window.location.href = "/login"; //redirect to login Page
    }
    onError(extractErrorMessageFromHTMLDoc(error?.response?.data));
  } finally {
    setLoading && setLoading(false);
  }
};

const extractErrorMessageFromHTMLDoc = (data: string): string => {
  let errorMessage: string;
  // Parse the HTML string into a Document
  const parser = new DOMParser();
  const doc: Document = parser.parseFromString(data, "text/html");

  // Query the <pre> tag
  const preElement: HTMLPreElement | null = doc.querySelector("pre");

  if (preElement) {
    // Get the content before the <br> tag
    let contentBeforeBr: string = preElement.innerHTML.split("<br>")[0].trim();
    contentBeforeBr = contentBeforeBr.replace(/^Error:\s*/, "").trim();
    errorMessage = contentBeforeBr;
  } else {
    errorMessage = "Something went wrong";
  }

  return errorMessage;
};

export const extractParamsfromSearchUrl = (url: string, param: string) => {
  const urlObj = new URL(url);
  const params: URLSearchParams = urlObj.searchParams;
  const result = params.get(param);

  return result;
};

export const blobUrlToBlob = async (blobUrl: string): Promise<Blob> => {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch the Blob from the Blob URL");
  }
  return await response.blob();
};

export const blobUrlToFile = async (
  blobUrl: string,
  fileName: string = "image.png"
): Promise<File> => {
  const response = await fetch(blobUrl);

  if (!response.ok)
    throw new Error(`Failed to fetch blob from URL: ${blobUrl}`);

  const blob = await response.blob();

  const file = new File([blob], fileName, { type: blob.type });

  return file;
};
