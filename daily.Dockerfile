FROM --platform=linux/amd64 node:18 as builder
WORKDIR /usr/app
COPY package.json ./
COPY . .
RUN yarn cache clean
RUN yarn install
RUN yarn generate:lambda:daily:nozip
    

FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /usr/app/dist/prisma ./prisma
COPY --from=builder /usr/app/dist/* ./
CMD ["index.handler"]