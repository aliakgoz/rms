"use client";

import { formatTaskTimestamp } from "@/lib/tasks/provider";
import type { TaskComment } from "@/lib/tasks/store";

export function TaskCommentThread({ comments }: { comments: TaskComment[] }) {
  if (comments.length === 0) {
    return <div className="task-empty">No comments yet. Use the note box to capture updates or handovers.</div>;
  }

  return (
    <div className="task-comment-list">
      {comments.map((comment) => (
        <article key={comment.id} className="task-comment-card">
          <div className="task-comment-top">
            <div className="meta">
              <span className={comment.kind === "comment" ? "tag" : "tag warn"}>{comment.kind}</span>
              <span className="tag slate">{comment.author || "anonymous"}</span>
            </div>
            <span className="muted">{formatTaskTimestamp(comment.createdAt)}</span>
          </div>
          <p>{comment.body}</p>
        </article>
      ))}
    </div>
  );
}
