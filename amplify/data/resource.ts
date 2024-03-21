import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const cursorType = {
    x: a.integer(),
    y: a.integer(),
    username: a.string()
}

const schema = a.schema({
  Todo: a.model({
      content: a.string(),
    })
    .authorization([a.allow.owner(), a.allow.public().to(['read'])]),

  Cursor: a.customType(cursorType),

  publishCursor: a.mutation()
    .arguments(cursorType)
    .returns(a.ref('Cursor'))
    .authorization([a.allow.public()])
    .handler(a.handler.custom({
      entry: './publishCursor.js',
    })),

  subscribeCursor: a.subscription()
    .returns(a.ref('Cursor'))
    .for(a.ref('publishCursor'))
    .authorization([a.allow.public()])
    .handler(a.handler.custom({
      entry: 'subscribeCursor.js',
    }))
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});