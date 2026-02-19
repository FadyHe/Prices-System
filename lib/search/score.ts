export function scoreProduct(
  productTokens: string[],
  queryTokens: string[]
): number {
  let score = 0;

  for (const qToken of queryTokens) {
    let matched = false;

    for (const pToken of productTokens) {
      // exact match
      if (pToken === qToken) {
        score += 1;
        matched = true;
        break;
      }

      // partial / relevant match
      if (
        pToken.includes(qToken) ||
        qToken.includes(pToken)
      ) {
        score += 0.5;
        matched = true;
        break;
      }
    }

    // لو query token ملقاش أي حاجة في المنتج
    if (!matched) {
      score += 0;
    }
  }

  return score;
}
