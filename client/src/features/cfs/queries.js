import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCfsIdentity, getCfsPost, getCfsPosts, getCfsStories } from "../../services/cfs.service";

export const cfsKeys = {
  posts: (page, limit = 100) => ["cfs", "posts", { page, limit }],
  stories: ["cfs", "stories"],
  identity: ["cfs", "identity"],
  post: (id) => ["cfs", "post", String(id)],
};

const dataOf = (response) => response.data?.data;

export const useCfsPosts = (page, limit = 100) => {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: cfsKeys.posts(page, limit),
    queryFn: async () => dataOf(await getCfsPosts({ page, limit })),
    placeholderData: (previous) => previous,
  });
  const setPosts = (updater) => client.setQueryData(cfsKeys.posts(page, limit), (current) => {
    const posts = current?.posts || [];
    const next = typeof updater === "function" ? updater(posts) : updater;
    return { ...(current || { pagination: { totalPages: 1 } }), posts: next };
  });
  return { posts: query.data?.posts || [], pagination: query.data?.pagination || { totalPages: 1 }, setPosts, ...query };
};

export const useCfsStories = () => {
  const client = useQueryClient();
  const query = useQuery({ queryKey: cfsKeys.stories, queryFn: async () => dataOf(await getCfsStories()).stories || [] });
  return { stories: query.data || [], setStories: (updater) => client.setQueryData(cfsKeys.stories, (current = []) => typeof updater === "function" ? updater(current) : updater), ...query };
};

export const useCfsIdentity = () => {
  const client = useQueryClient();
  const query = useQuery({ queryKey: cfsKeys.identity, queryFn: async () => dataOf(await getCfsIdentity()).alias || "" });
  return { alias: query.data || "", setAlias: (alias) => client.setQueryData(cfsKeys.identity, alias), ...query };
};

export const useCfsPost = (postId) => {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: cfsKeys.post(postId),
    queryFn: async () => dataOf(await getCfsPost(postId)).post || null,
    enabled: Boolean(postId),
  });
  return { detailPost: query.data || null, setDetailPost: (updater) => postId && client.setQueryData(cfsKeys.post(postId), (current) => typeof updater === "function" ? updater(current) : updater), ...query };
};

// Socket events carry a post id. Patch every cached feed and detail record so a
// realtime update never forces a complete CFS reload.
export const patchCachedCfsPost = (client, postId, updater) => {
  client.setQueriesData({ queryKey: ["cfs", "posts"] }, (current) => {
    if (!current?.posts) return current;
    return { ...current, posts: current.posts.map((post) => String(post._id) === String(postId) ? updater(post) : post) };
  });
  client.setQueryData(cfsKeys.post(postId), (current) => current ? updater(current) : current);
};
