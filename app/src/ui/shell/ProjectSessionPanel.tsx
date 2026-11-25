import { useState, type FormEvent } from 'react';
import { useShellStore } from './store';

export function ProjectSessionPanel() {
  const projectDialogMode = useShellStore((s) => s.projectDialogMode);
  const isSubmittingProject = useShellStore((s) => s.isSubmittingProject);
  const setProjectDialogMode = useShellStore((s) => s.setProjectDialogMode);
  const createProject = useShellStore((s) => s.createProject);
  const openProject = useShellStore((s) => s.openProject);

  const [titleInput, setTitleInput] = useState('');
  const [projectDirInput, setProjectDirInput] = useState('');

  if (projectDialogMode === 'closed') {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectDialogMode === 'create') {
      void createProject({
        title: titleInput,
        projectDir: projectDirInput
      });
    } else {
      void openProject({
        projectDir: projectDirInput
      });
    }
  };

  return (
    <section
      className="df-project-panel"
      aria-label={
        projectDialogMode === 'create'
          ? 'Khởi tạo không gian dự án mới'
          : 'Mở dự án DocFlow Studio hiện có'
      }
    >
      <div className="df-project-panel-header">
        <div>
          <h3>
            {projectDialogMode === 'create'
              ? 'Khởi tạo dự án DocFlow Studio mới'
              : 'Mở thư mục dự án hiện có'}
          </h3>
          <p>
            {projectDialogMode === 'create'
              ? 'Tạo cây thư mục dự án chuẩn ngoài kho mã nguồn (manifest.json, .project.lock, project.sqlite, template/, sources/, recipe/, sections/, runs/, builds/, working/).'
              : 'Đặt khóa phiên độc quyền (.project.lock), chạy SQLite migrations và đối chiếu mã băm sha256 của Template V0 cùng mọi Source Snapshot.'}
          </p>
        </div>
        <button
          type="button"
          className="df-btn df-btn-ghost"
          onClick={() => setProjectDialogMode('closed')}
          disabled={isSubmittingProject}
        >
          Đóng
        </button>
      </div>

      <form className="df-project-form" onSubmit={handleSubmit}>
        {projectDialogMode === 'create' && (
          <label className="df-field">
            <span>Tên dự án nghiệp vụ</span>
            <input
              type="text"
              name="projectTitle"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Ví dụ: Thuyết minh kế hoạch kinh doanh năm mới"
              required
              disabled={isSubmittingProject}
            />
          </label>
        )}

        <label className="df-field">
          <span>Đường dẫn thư mục dự án trên máy trạm (bên ngoài kho mã nguồn)</span>
          <input
            type="text"
            name="projectDir"
            value={projectDirInput}
            onChange={(e) => setProjectDirInput(e.target.value)}
            placeholder="/Users/<ten-nguoi-dung>/DocFlowProjects/du-an-tai-lieu"
            required
            disabled={isSubmittingProject}
          />
        </label>

        <div className="df-form-actions">
          <button
            type="button"
            className="df-btn"
            onClick={() => setProjectDialogMode('closed')}
            disabled={isSubmittingProject}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="df-btn df-btn-primary"
            disabled={
              isSubmittingProject ||
              !projectDirInput.trim() ||
              (projectDialogMode === 'create' && !titleInput.trim())
            }
          >
            {isSubmittingProject
              ? 'Đang xử lý qua IPC...'
              : projectDialogMode === 'create'
                ? 'Khởi tạo dự án rỗng'
                : 'Mở dự án'}
          </button>
        </div>
      </form>
    </section>
  );
}
