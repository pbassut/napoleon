import { getCurrentTask, TodoItem } from '../../../src/ui/ink/types';

describe('UI Ink Types', () => {
  describe('getCurrentTask', () => {
    it('should return null for undefined todos', () => {
      const result = getCurrentTask(undefined);
      expect(result).toBeNull();
    });

    it('should return null for null todos', () => {
      const result = getCurrentTask(null as any);
      expect(result).toBeNull();
    });

    it('should return null for non-array todos', () => {
      const result = getCurrentTask('not-an-array' as any);
      expect(result).toBeNull();
    });

    it('should return null for empty todos array', () => {
      const result = getCurrentTask([]);
      expect(result).toBeNull();
    });

    it('should return null when no in_progress tasks exist', () => {
      const todos: TodoItem[] = [
        { id: '1', content: 'Task 1', priority: 'high', status: 'pending' },
        { id: '2', content: 'Task 2', priority: 'medium', status: 'completed' },
        { id: '3', content: 'Task 3', priority: 'low', status: 'pending' }
      ];
      const result = getCurrentTask(todos);
      expect(result).toBeNull();
    });

    it('should return the only in_progress task', () => {
      const todos: TodoItem[] = [
        { id: '1', content: 'Task 1', priority: 'high', status: 'pending' },
        { id: '2', content: 'Task 2', priority: 'medium', status: 'in_progress' },
        { id: '3', content: 'Task 3', priority: 'low', status: 'completed' }
      ];
      const result = getCurrentTask(todos);
      expect(result).toEqual({
        id: '2',
        content: 'Task 2',
        priority: 'medium',
        status: 'in_progress'
      });
    });

    it('should return the first in_progress task when multiple exist', () => {
      const todos: TodoItem[] = [
        { id: '1', content: 'Task 1', priority: 'high', status: 'pending' },
        { id: '2', content: 'Task 2', priority: 'medium', status: 'in_progress' },
        { id: '3', content: 'Task 3', priority: 'low', status: 'in_progress' },
        { id: '4', content: 'Task 4', priority: 'high', status: 'completed' }
      ];
      const result = getCurrentTask(todos);
      expect(result).toEqual({
        id: '2',
        content: 'Task 2',
        priority: 'medium',
        status: 'in_progress'
      });
    });

    it('should handle todos with all statuses', () => {
      const todos: TodoItem[] = [
        { id: '1', content: 'Pending Task', priority: 'high', status: 'pending' },
        { id: '2', content: 'Current Task', priority: 'medium', status: 'in_progress' },
        { id: '3', content: 'Done Task', priority: 'low', status: 'completed' }
      ];
      const result = getCurrentTask(todos);
      expect(result).toEqual({
        id: '2',
        content: 'Current Task',
        priority: 'medium',
        status: 'in_progress'
      });
    });

    it('should handle todos with different priorities', () => {
      const highPriorityTask = {
        id: 'high-task',
        content: 'High Priority Task',
        priority: 'high' as const,
        status: 'in_progress' as const
      };

      const mediumPriorityTask = {
        id: 'medium-task',
        content: 'Medium Priority Task',
        priority: 'medium' as const,
        status: 'in_progress' as const
      };

      const todos: TodoItem[] = [
        { id: '1', content: 'Task 1', priority: 'low', status: 'completed' },
        mediumPriorityTask,
        highPriorityTask,
        { id: '4', content: 'Task 4', priority: 'low', status: 'pending' }
      ];

      // Should return the first in_progress task (medium priority in this case)
      const result = getCurrentTask(todos);
      expect(result).toEqual(mediumPriorityTask);
    });

    it('should handle edge case with malformed todo items', () => {
      const todos = [
        { id: '1', content: 'Valid Task', priority: 'high', status: 'in_progress' },
        { id: '2', content: 'Invalid Task' } as any, // Missing priority and status
        { id: '3', content: 'Another Task', priority: 'low', status: 'pending' }
      ] as TodoItem[];

      const result = getCurrentTask(todos);
      expect(result).toEqual({
        id: '1',
        content: 'Valid Task',
        priority: 'high',
        status: 'in_progress'
      });
    });

    it('should work with minimal valid todo structure', () => {
      const todos: TodoItem[] = [
        {
          id: 'min-task',
          content: 'Minimal task',
          priority: 'medium',
          status: 'in_progress'
        }
      ];
      const result = getCurrentTask(todos);
      expect(result).toEqual({
        id: 'min-task',
        content: 'Minimal task',
        priority: 'medium',
        status: 'in_progress'
      });
    });
  });
});