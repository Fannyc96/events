import { Plus } from './Icons';

export function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="fab" aria-label="新增事件" onClick={onClick}>
      <Plus />
    </button>
  );
}
