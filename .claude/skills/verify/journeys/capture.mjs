export async function capture(page, options) {
  await page.evaluate(async () => {
    const transition = document.activeViewTransition;
    if (transition) {
      await transition.ready;
      await transition.finished;
    }
  });
  return page.screenshot(options);
}
