import { createHash } from 'node:crypto'

// This verifies a recorded human visual review, not the meaning of an image.
// A changed cue, sense, form, register or image needs a fresh visual comparison.
export function assertIllustrationReview(cardId, scenario, imageBytes, review) {
  const fields = ['ja', 'en', 'usage', 'prompt', 'form', 'register']
  if (!scenario || !review?.context || !review.reviewedAt || !review.method ||
      fields.some(field => review.context[field] !== scenario[field]) ||
      review.imageSha256 !== createHash('sha256').update(imageBytes).digest('hex')) {
    throw new Error(`${cardId}: イラストと英語状況文・答えの組み合わせを目視で再確認し、確認記録を更新してください。`)
  }
}
