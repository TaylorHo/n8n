FROM node:20-alpine3.20@sha256:c13b26e7e602ef2f1074aef304ce6e9b7dd284c419b35d89fcf3cc8e44a8def9 AS builder
WORKDIR /

RUN apk add --update --no-cache git
RUN git clone --depth=1 --branch master https://github.com/TaylorHo/n8n.git
RUN npm i -g pnpm

WORKDIR /n8n/
COPY ./assets/favicon.ico ./packages/editor-ui/public/favicon.ico
RUN pnpm install
RUN sed -i'' -e 's/n8n.io - Workflow Automation/Automação/g' ./packages/editor-ui/index.html
RUN sed -i'' -e 's/ea4b71/a259ff/gI' ./packages/editor-ui/public/static/**/*.svg
RUN sed -i'' -e 's/ff6d5a/a259ff/gI' ./packages/cli/templates/*.handlebars
RUN pnpm build

# Changing primary color (just the sed with -i wasn't working, so using it with some more steps below)
RUN sed -i'' -e 's#--prim-color-primary-h: 7;#--prim-color-primary-h: 266;#g' ./packages/editor-ui/dist/assets/index-*.css

FROM n8nio/n8n:1.67.0@sha256:53734eaafdea67a791d57d7fdf3cc3621f24dfdca96ce922e6ec0f806c1d80dd AS main
USER root

RUN rm -rf /usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist
COPY --from=builder /n8n/packages/editor-ui/dist /usr/local/lib/node_modules/n8n/node_modules/n8n-editor-ui/dist
COPY --from=builder /n8n/packages/cli/dist/license.js /usr/local/lib/node_modules/n8n/dist/license.js
COPY --from=builder /n8n/packages/cli/templates /usr/local/lib/node_modules/n8n/templates
COPY --from=builder /n8n/packages/nodes-base/dist/nodes/Google/Gmail/GenericFunctions.js /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/Google/Gmail/GenericFunctions.js
COPY --from=builder /n8n/packages/nodes-base/dist/nodes/EmailSend/v2/send.operation.js /usr/local/lib/node_modules/n8n/node_modules/n8n-nodes-base/dist/nodes/EmailSend/v2/send.operation.js

RUN set -eux; \
  npm i -g uglifycss && \
  find /usr/local -type f -name '*.js.map' -delete && \
  find /usr/local -type f -name '*.css.map' -delete && \
  find /usr/local -type f -name 'LICENSE.md' -delete && \
  find /usr/local -type f -name 'LICENSE' -delete && \
  find /usr/local -type f -name 'README.md' -delete && \
  find /usr/local -type f -name 'CHANGELOG.md' -delete && \
  find /usr/local -type f -name 'SECURITY.md' -delete && \
  find /usr/local -type f -name 'CONTRIBUTING.md' -delete && \
  find /usr/local -type f -name 'CODE_OF_CONDUCT.md' -delete && \
  find /usr/local -type f -name '.travis.yml' -delete && \
  find /usr/local -type f -name '.dockerignore' -delete && \
  find /usr/local -type f -name '.yarnrc' -delete && \
  find /usr/local -type f -name '.npmrc' -delete && \
  find /usr/local -type f -name 'package-lock.json' -delete && \
  find /usr/local -type f -name 'yarn.lock' -delete && \
  find /usr/local -type f -name '.eslint*' -delete && \
  find /usr/local -type f -name '.prettier*' -delete && \
  find /usr/local -type f -name '.gitignore' -delete && \
  find /usr/local -type f -name 'AUTHORS' -delete && \
  find /usr/local -type f -name '.gitattributes' -delete && \
  find /usr/local -type f -name '.spec.js' -name '.test.js' -name '.spec.ts' -name '.test.ts' -delete && \
  find /usr/local -type d -name '.github' -exec rm -rf {} + && \
  find /usr/local -type d -name '.circleci' -exec rm -rf {} + && \
  find /usr/local -type d -name '.vscode' -exec rm -rf {} + && \
  find /usr/local -type d -name '.idea' -exec rm -rf {} + && \
  find /usr/local -type d -name 'docs' -exec rm -rf {} + && \
  find /usr/local -type d -name 'test' -exec rm -rf {} + && \
  find /usr/local -type d -name '.git' -exec rm -rf {} + && \
  find /usr/local -type d -name '.husky' -exec rm -rf {} + && \
  find /usr/local -type d -name '.turbo' -exec rm -rf {} + && \
  find /usr/local -type f -name '*.js' -exec sed -i'' -e 's#//\# sourceMappingURL=.*\.map##g' {} + && \
  find /usr/local -type f -name '*.css' ! -name '*min.css' -exec sh -c 'uglifycss "$1" > "$1.min" && mv "$1.min" "$1"' _ {} \;

FROM node:20-alpine3.20@sha256:c13b26e7e602ef2f1074aef304ce6e9b7dd284c419b35d89fcf3cc8e44a8def9
COPY --from=main /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n

## Performance related environment variables

# Personalization
ENV N8N_PERSONALIZATION_ENABLED=false
ENV N8N_VERSION_NOTIFICATIONS_ENABLED=true
ENV N8N_DIAGNOSTICS_ENABLED=false
ENV N8N_HIRING_BANNER_ENABLED=false

# Logging
ENV N8N_LOG_LEVEL=warn
ENV N8N_LOG_FILE_COUNT_MAX=10
ENV N8N_LOG_FILE_SIZE_MAX=4

# General options
ENV N8N_DEFAULT_BINARY_DATA_MODE=filesystem
ENV DB_TYPE=sqlite
ENV DB_SQLITE_VACUUM_ON_STARTUP=true
ENV WORKFLOWS_DEFAULT_NAME="Automação"
ENV N8N_HIDE_USAGE_PAGE=true
ENV N8N_DEFAULT_LOCALE="pt-BR"

WORKDIR /home/node
RUN \
  apk add --update --no-cache tini && \
  mkdir .n8n && \
  chown node:node .n8n

USER node
EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/usr/local/lib/node_modules/n8n/bin/n8n"]
