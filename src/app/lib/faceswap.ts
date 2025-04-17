const BASE = "https://api.piapi.ai/api/face_swap/v1";
const key  = process.env.PIAPI_KEY!;

export async function createFaceSwap(
  targetBase64: string,  //   frame image (PNG, one face)
  swapBase64: string     //   user selfie
): Promise<string> {
  const res = await fetch(`${BASE}/async`, {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      target_image: `data:image/png;base64,${targetBase64}`,
      swap_image:   `data:image/png;base64,${swapBase64}`,
      result_type:  "url"
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).data.task_id as string;
}

export async function fetchFaceSwap(taskId: string) {
  const res = await fetch(`${BASE}/fetch`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId, result_type: "url" })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return {
    status: data.data.status as "QUEUED"|"RUNNING"|"FAILED"|"COMPLETED",
    url:    data.data.result_url as string | undefined
  };
}