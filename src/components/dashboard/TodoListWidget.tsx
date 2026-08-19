"use client";

import { useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

const defaultTodos: Todo[] = [
  { id: "1", text: "Relancer les parents pour le 2ème trimestre 🔥", completed: false },
  { id: "2", text: "Valider les inscriptions en 6ème", completed: true },
  { id: "3", text: "Vérifier les absences de la semaine 📅", completed: false },
];

export default function TodoListWidget() {
  const [todos, setTodos] = useState<Todo[]>(defaultTodos);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    
    setTodos([
      { id: Date.now().toString(), text: newTaskText, completed: false },
      ...todos
    ]);
    setNewTaskText("");
    setIsAdding(false);
  };

  return (
    <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/60 flex flex-col flex-1 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Decorative corner */}
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-blue-50 opacity-70 pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
          <span className="text-xl">✏️</span>
          <h2 className="text-2xl font-semibold text-text-primary tracking-tight">À faire</h2>
        </div>
        
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center text-sm font-medium text-text-muted hover:text-text-primary transition-colors mb-4"
          >
            <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
          </button>
        ) : (
          <form onSubmit={handleAddTask} className="mb-4 flex gap-2">
            <input 
              type="text" 
              autoFocus
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Nom de la tâche..." 
              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button type="submit" className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover">
              Ajouter
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 bg-secondary text-text-secondary text-sm font-medium rounded-lg hover:bg-border">
              Annuler
            </button>
          </form>
        )}
        
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2">
          {todos.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">Aucune tâche pour le moment.</p>
          )}
          {todos.map(todo => (
            <label key={todo.id} className="flex items-start gap-3 cursor-pointer group/item">
              <input 
                type="checkbox" 
                className="peer sr-only" 
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <div className={`h-5 w-5 flex-shrink-0 rounded-md border flex items-center justify-center transition-all duration-300 mt-0.5 shadow-sm group-hover/item:scale-110 ${
                todo.completed 
                  ? "bg-primary border-primary text-white scale-110" 
                  : "border-border text-transparent bg-white/50 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary peer-checked:scale-110"
              }`}>
                <CheckCircle2 className={todo.completed ? "h-4 w-4" : "h-3.5 w-3.5"} />
              </div>
              <span className={`text-sm font-medium leading-tight transition-all duration-300 ${
                todo.completed ? "text-text-muted line-through opacity-60" : "text-text-primary group-hover/item:text-primary"
              }`}>
                {todo.text}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
