import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "images",
  access: (allow) => ({
    "/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      allow.guest.to(["read", "write"]),
    ],
  }),
});
