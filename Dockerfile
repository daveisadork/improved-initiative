FROM node:carbon-alpine

COPY . /usr/src/app
WORKDIR /usr/src/app
ENV PATH=$PATH:/usr/src/app/node_modules/.bin

RUN \
  npm ci --unsafe-perm && \
  npm uninstall mongodb-memory-server && \
  npm prune --production --unsafe-perm && \
  npm dedupe && \
  npm cache clean --force

EXPOSE 80
CMD ["node", "server/server.js"]
