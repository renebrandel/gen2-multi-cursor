import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const cursorType = {
  roomId: a.string().required(),
  x: a.integer().required(),
  y: a.integer().required(),
  username: a.string().required()
}

const schema = a.schema({
  Room: a.model({
    name: a.string(),
  }).authorization([a.allow.public()]),

  Cursor: a.customType(cursorType),

  publishCursor: a.mutation()
    .arguments(cursorType)
    .returns(a.ref('Cursor'))
    .authorization([a.allow.public()])
    .handler(a.handler.custom({
      entry: './publishCursor.js',
    })),
  
  subscribeCursor: a.subscription()
    .for(a.ref('publishCursor'))
    .arguments({ roomId: a.string(), myUsername: a.string() })
    .authorization([a.allow.public()])
    .handler(a.handler.custom({
      entry: './subscribeCursor.js'
    }))
    .returns(a.ref('Cursor'))
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