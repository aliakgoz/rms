"use client";

import { useState } from "react";
import { formatTaskPriorityLabel, TASK_PRIORITY_OPTIONS } from "@/lib/tasks/store";
import { useTaskData } from "@/lib/tasks/provider";

export function TaskQuickAdd({ onCreated }: { onCreated?: () => void }) {
  const { connected, db, createTaskRecord } = useTaskData();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  const groups = [...db.groups].sort((left, right) => left.localeCompare(right, "tr"));

  async function onSubmit(formData: FormData) {
    setIsSaving(true);
    setMessage("");

    try {
      const payload = Object.fromEntries(formData.entries()) as Record<string, string>;
      const groupName = (isAddingGroup ? newGroup : payload.group || "").trim();

      if (isAddingGroup && !groupName) {
        throw new Error("Yeni grup adi gerekli.");
      }

      const task = await createTaskRecord({
        title: payload.title,
        group: groupName,
        details: payload.details,
        owner: payload.owner,
        dueDate: payload.dueDate,
        priority: payload.priority as "low" | "normal" | "high" | "critical",
        createdBy: payload.createdBy,
        tags: payload.tags,
        initialComment: payload.initialComment
      });
      setMessage(`${task.title} added.`);
      setIsAddingGroup(false);
      setNewGroup("");
      onCreated?.();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Task could not be created.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="page-head">
        <h2>Quick Add</h2>
        <p>Fast capture first. Only title is required; everything else is optional.</p>
      </div>

      <form
        className="form-grid"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const saved = await onSubmit(new FormData(form));
          if (saved) {
            form.reset();
          }
        }}
      >
        <label className="full form-field">
          <span>Task title *</span>
          <small>Short, action-oriented, and readable.</small>
          <input name="title" required placeholder="Prepare shielding review package for April meeting" />
        </label>

        <label className="form-field">
          <span>Owner</span>
          <small>Free-text owner keeps entry friction low.</small>
          <input name="owner" placeholder="Ali" />
        </label>

        <label className="form-field">
          <div className="task-inline-label">
            <span>Group</span>
            <button
              className="chip-button task-inline-button"
              type="button"
              onClick={() => setIsAddingGroup((current) => !current)}
              disabled={!connected}
            >
              +
            </button>
          </div>
          <small>Select an existing group or add a new one.</small>
          {isAddingGroup ? (
            <input
              value={newGroup}
              onChange={(event) => setNewGroup(event.target.value)}
              placeholder="Yeni grup"
            />
          ) : (
            <select name="group" defaultValue={groups.includes("Diğer") ? "Diğer" : groups[0] || ""}>
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="form-field">
          <span>Due date</span>
          <small>Optional. Empty means no deadline yet.</small>
          <input name="dueDate" type="date" />
        </label>

        <label className="form-field">
          <span>Priority</span>
          <small>Defaults to normal.</small>
          <select name="priority" defaultValue="normal">
            {TASK_PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {formatTaskPriorityLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Created by</span>
          <small>Optional author name for audit context.</small>
          <input name="createdBy" placeholder="Rayk team" />
        </label>

        <label className="full form-field">
          <span>Tags</span>
          <small>Comma-separated, for example licensing, review, waiting.</small>
          <input name="tags" placeholder="licensing, package, april" />
        </label>

        <label className="full form-field">
          <span>Details</span>
          <small>Context if the task title alone is not enough.</small>
          <textarea
            name="details"
            rows={4}
            placeholder="Collect final inputs, align stakeholders, and upload the meeting pack to the shared folder."
          />
        </label>

        <label className="full form-field">
          <span>First note</span>
          <small>Optional opening note or handover comment.</small>
          <textarea name="initialComment" rows={3} placeholder="Waiting for cost estimate from the supplier." />
        </label>

        <div className="full form-actions">
          <button className="primary" type="submit" disabled={!connected || isSaving}>
            {isSaving ? "Saving..." : "Add Task"}
          </button>
          {message ? <span className="form-message">{message}</span> : null}
        </div>
      </form>
    </section>
  );
}
