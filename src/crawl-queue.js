const crawlerCompleted = [];
const crawlerQueue = [];

module.exports = root => ({
  add: links => {
    crawlerQueue.push(
      ...links
        .filter(l => l.startsWith(root))
        .map(l => {
          while(l.endsWith('/')) l = l.slice(0, -1); // Strip trailing slashes
          return l;
        })
    );
  },

  hasItems: () => crawlerQueue.length,

  next: async fn => {
    const item = crawlerQueue.shift();
    if(crawlerCompleted.includes(item)) return;

    crawlerCompleted.push(item);
    await fn(item);
  }
});
