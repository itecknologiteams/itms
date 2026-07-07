/** Simulates network latency in mock mode so loading states are visible/testable. */
export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
