export { PostCoordinator } from "./functions/durable/PostCoordinator.js";

export default {
  async fetch() {
    return new Response("BLuxury Durable Object Worker");
  },
};