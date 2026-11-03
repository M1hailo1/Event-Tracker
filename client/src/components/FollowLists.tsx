import { Link } from "react-router-dom";
import type { FollowUser } from "../types";
import { usePagedList, ListMore } from "./usePagedList";

function FollowList({ userId, kind }: { userId: string; kind: "followers" | "following" }) {
  const list = usePagedList<FollowUser>(`/users/${userId}/${kind}`);
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{list.total}</p>
      <h2 className="mb-3 text-sm text-gray-500">{kind === "followers" ? "Followers" : "Following"}</h2>
      <ul className="space-y-1">
        {list.items.map(item => (
          <li key={item.id}>
            <Link className="break-words text-sm text-indigo-600 dark:text-indigo-400" to={`/users/${item.id}`}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
      <ListMore {...list} onMore={list.loadMore} />
    </div>
  );
}

export default function FollowLists({ userId, refreshKey = 0 }: { userId: string; refreshKey?: number }) {
  return (
    <div className="my-6 grid grid-cols-2 gap-4">
      <FollowList key={`${userId}:followers:${refreshKey}`} userId={userId} kind="followers" />
      <FollowList key={`${userId}:following:${refreshKey}`} userId={userId} kind="following" />
    </div>
  );
}
