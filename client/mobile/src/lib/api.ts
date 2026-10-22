const API_BASE_URL = "http://192.168.0.101:5000/api";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Server returned non-JSON (${response.status}): ${text.slice(0, 150)}`,
    );
  }

  if (!response.ok) {
    throw new Error(data.message ?? "Something went wrong");
  }

  return data as T;
}
