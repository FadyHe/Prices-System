export function scoreProduct(
  productTokens: string[],
  queryTokens: string[]
): number {
  let score = 0;

  for (const qToken of queryTokens) {
    let matched = false;

    for (const pToken of productTokens) {
      if (pToken === qToken) {
        score += 1;
        matched = true;
        break;
      }

      if (
        pToken.includes(qToken) ||
        qToken.includes(pToken)
      ) {
        score += 0.5;
        matched = true;
        break;
      }
    }

    if (!matched) {
      score += 0;
    }
  }

  return score;
}
