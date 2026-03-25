export const getMLScore = async () => {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return Math.floor(Math.random() * 101);
};
