/**
 * Phone photos are often 4–12 MB. Shrinking to a sensible size before keeping them
 * saves storage, memory and time — a 1600px JPEG still looks sharp on any phone.
 */
export async function downscale(file: Blob, maxSide = 1600, quality = 0.85): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file) // throws for files the browser can't decode
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not encode image')
  return { blob, width, height }
}
