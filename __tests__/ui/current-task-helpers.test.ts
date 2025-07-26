import { getCurrentTask, TodoItem } from '../../src/ui/ink/types';

describe('getCurrentTask helper function', () => {
  it('should return null when todos is undefined', () => {
    const result = getCurrentTask(undefined);
    expect(result).toBeNull();
  });

  it('should return null when todos is not an array', () => {
    const result = getCurrentTask(null as any);
    expect(result).toBeNull();
  });

  it('should return null when todos array is empty', () => {
    const result = getCurrentTask([]);
    expect(result).toBeNull();
  });

  it('should return null when no in_progress todos exist', () => {
    const todos: TodoItem[] = [
      { id: '1', content: 'Task 1', status: 'pending', priority: 'high' },
      { id: '2', content: 'Task 2', status: 'completed', priority: 'medium' },
    ];
    
    const result = getCurrentTask(todos);
    expect(result).toBeNull();
  });

  it('should return the single in_progress task', () => {
    const todos: TodoItem[] = [
      { id: '1', content: 'Task 1', status: 'pending', priority: 'high' },
      { id: '2', content: 'Current Task', status: 'in_progress', priority: 'high' },
      { id: '3', content: 'Task 3', status: 'completed', priority: 'medium' },
    ];
    
    const result = getCurrentTask(todos);
    expect(result).toEqual(todos[1]);
  });

  it('should return the first in_progress task when multiple exist', () => {
    const todos: TodoItem[] = [
      { id: '1', content: 'Task 1', status: 'pending', priority: 'high' },
      { id: '2', content: 'First Current Task', status: 'in_progress', priority: 'high' },
      { id: '3', content: 'Second Current Task', status: 'in_progress', priority: 'medium' },
      { id: '4', content: 'Task 4', status: 'completed', priority: 'low' },
    ];
    
    const result = getCurrentTask(todos);
    expect(result).toEqual(todos[1]);
  });

  it('should handle todos with only completed status', () => {
    const todos: TodoItem[] = [
      { id: '1', content: 'Task 1', status: 'completed', priority: 'high' },
      { id: '2', content: 'Task 2', status: 'completed', priority: 'medium' },
    ];
    
    const result = getCurrentTask(todos);
    expect(result).toBeNull();
  });

  it('should handle todos with only pending status', () => {
    const todos: TodoItem[] = [
      { id: '1', content: 'Task 1', status: 'pending', priority: 'high' },
      { id: '2', content: 'Task 2', status: 'pending', priority: 'medium' },
    ];
    
    const result = getCurrentTask(todos);
    expect(result).toBeNull();
  });

  it('should work with mixed priority levels', () => {
    const todos: TodoItem[] = [
      { id: '1', content: 'Low Priority Task', status: 'in_progress', priority: 'low' },
      { id: '2', content: 'High Priority Task', status: 'pending', priority: 'high' },
    ];
    
    const result = getCurrentTask(todos);
    expect(result).toEqual(todos[0]);
  });
});