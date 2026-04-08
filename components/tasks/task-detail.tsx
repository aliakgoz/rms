"use client";

import { useEffect, useState } from "react";
import { formatTaskTimestamp } from "@/lib/tasks/provider";
import {
  formatTaskPriorityLabel,
  formatTaskStatusLabel,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type TaskComment,
  type TaskRecord
} from "@/lib/tasks/store";
import { useTaskData } from "@/lib/tasks/provider";
import { TaskCommentThread } from "@/components/tasks/task-comment-thread";

type Props = {
  task?: TaskRecord;
  comments: TaskComment[];
};

type TaskFormState = {
  title: string;
  group: string;
  details: string;
  status: string;
  priority: string;
  owner: string;
  dueDate: string;
  tags: string;
  author: string;
  note: string;
  commentAuthor: string;
  commentBody: string;
};

function createFormState(task?: TaskRecord): TaskFormState {
  return {
    title: task?.title || "",
    group: task?.group || "Diğer",
    details: task?.details || "",
    status: task?.status || "open",
    priority: task?.priority || "normal",
    owner: task?.owner || "",
    dueDate: task?.dueDate || "",
    tags: task?.tags.join(", ") || "",
    author: "",
    note: "",
    commentAuthor: "",
    commentBody: ""
  };
}

export function TaskDetail({ task, comments }: Props) {
  const { connected, db, updateTaskRecord, addTaskCommentRecord } = useTaskData();
  const [form, setForm] = useState<TaskFormState>(() => createFormState(task));
  const [isSaving, setIsSaving] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [message, setMessage] = useState("");
  const groups = [...db.groups].sort((left, right) => left.localeCompare(right, "tr"));

  useEffect(() => {
    setForm(createFormState(task));
    setMessage("");
  }, [task?.id]);

  if (!task) {
    return <div className="task-empty">Select a task to inspect details, change status, or add comments.</div>;
  }

  const currentTask = task;

  async function saveTask() {
    setIsSaving(true);
    setMessage("");

    try {
      const updated = await updateTaskRecord(currentTask.id, {
        title: form.title,
        group: form.group,
        details: form.details,
        status: form.status as TaskRecord["status"],
        priority: form.priority as TaskRecord["priority"],
        owner: form.owner,
        dueDate: form.dueDate,
        tags: form.tags,
        author: form.author,
        note: form.note
      });

      setForm((current) => ({
        ...current,
        title: updated.title,
        group: updated.group,
        details: updated.details,
        status: updated.status,
        priority: updated.priority,
        owner: updated.owner,
        dueDate: updated.dueDate || "",
        tags: updated.tags.join(", "),
        note: ""
      }));
      setMessage("Task updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Task could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addComment() {
    if (!form.commentBody.trim()) {
      return;
    }

    setIsCommenting(true);
    setMessage("");

    try {
      await addTaskCommentRecord({
        taskId: currentTask.id,
        body: form.commentBody,
        author: form.commentAuthor
      });
      setForm((current) => ({
        ...current,
        commentBody: ""
      }));
      setMessage("Comment added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Comment could not be saved.");
    } finally {
      setIsCommenting(false);
    }
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="page-head">
          <h2>Task Detail</h2>
          <p>Edit task fields freely, add an update note when needed, and keep the audit trail in comments.</p>
        </div>

        <div className="task-detail-meta">
          <span className="tag slate">{currentTask.group}</span>
          <span className="tag">{formatTaskStatusLabel(currentTask.status)}</span>
          <span className="tag slate">{formatTaskPriorityLabel(currentTask.priority)}</span>
          <span className="tag slate">created {formatTaskTimestamp(currentTask.createdAt)}</span>
          <span className="tag slate">updated {formatTaskTimestamp(currentTask.lastCommentAt || currentTask.updatedAt)}</span>
        </div>

        <div className="task-detail-grid">
          <label className="full form-field">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              disabled={!connected}
            />
          </label>

          <label className="form-field">
            <span>Group</span>
            <select
              value={form.group}
              onChange={(event) => setForm((current) => ({ ...current, group: event.target.value }))}
              disabled={!connected}
            >
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>

          <label className="full form-field">
            <span>Details</span>
            <textarea
              rows={5}
              value={form.details}
              onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
              disabled={!connected}
            />
          </label>

          <label className="form-field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              disabled={!connected}
            >
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatTaskStatusLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Priority</span>
            <select
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
              disabled={!connected}
            >
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatTaskPriorityLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Owner</span>
            <input
              value={form.owner}
              onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
              disabled={!connected}
            />
          </label>

          <label className="form-field">
            <span>Due date</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              disabled={!connected}
            />
          </label>

          <label className="full form-field">
            <span>Tags</span>
            <input
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="licensing, review, waiting"
              disabled={!connected}
            />
          </label>

          <label className="form-field">
            <span>Update author</span>
            <input
              value={form.author}
              onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))}
              placeholder="Ali"
              disabled={!connected}
            />
          </label>

          <label className="full form-field">
            <span>Update note</span>
            <textarea
              rows={3}
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              placeholder="Status changed after supplier call."
              disabled={!connected}
            />
          </label>
        </div>

        <div className="form-actions">
          <button className="primary" type="button" onClick={() => void saveTask()} disabled={!connected || isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          {message ? <span className="form-message">{message}</span> : null}
        </div>
      </section>

      <section className="panel">
        <div className="page-head">
          <h2>Comments</h2>
          <p>Shared notes, updates, and handovers are visible to every synced client.</p>
        </div>

        <div className="task-detail-grid">
          <label className="form-field">
            <span>Comment author</span>
            <input
              value={form.commentAuthor}
              onChange={(event) => setForm((current) => ({ ...current, commentAuthor: event.target.value }))}
              placeholder="Ali"
              disabled={!connected}
            />
          </label>

          <label className="full form-field">
            <span>New comment</span>
            <textarea
              rows={3}
              value={form.commentBody}
              onChange={(event) => setForm((current) => ({ ...current, commentBody: event.target.value }))}
              placeholder="Need procurement feedback before moving this forward."
              disabled={!connected}
            />
          </label>
        </div>

        <div className="form-actions">
          <button className="primary" type="button" onClick={() => void addComment()} disabled={!connected || isCommenting}>
            {isCommenting ? "Posting..." : "Add Comment"}
          </button>
        </div>

        <TaskCommentThread comments={comments} />
      </section>
    </div>
  );
}
