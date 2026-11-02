import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Question, Subject, Topic } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { DriveImageUploader } from '../common/DriveImageUploader';
import {
  HelpCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Filter,
  Globe,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface QuestionBankProps {
  onNavigateToAIUpload?: () => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ onNavigateToAIUpload }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'hi'>('en');

  // Question Form State
  const [isEditing, setIsEditing] = useState(false);
  const [qCode, setQCode] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const [qEn, setQEn] = useState('');
  const [qHi, setQHi] = useState('');

  const [optAEn, setOptAEn] = useState('');
  const [optAHi, setOptAHi] = useState('');

  const [optBEn, setOptBEn] = useState('');
  const [optBHi, setOptBHi] = useState('');

  const [optCEn, setOptCEn] = useState('');
  const [optCHi, setOptCHi] = useState('');

  const [optDEn, setOptDEn] = useState('');
  const [optDHi, setOptDHi] = useState('');

  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [marks, setMarks] = useState('1.0');
  const [negativeMarks, setNegativeMarks] = useState('0.25');
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [optAImageUrl, setOptAImageUrl] = useState('');
  const [optBImageUrl, setOptBImageUrl] = useState('');
  const [optCImageUrl, setOptCImageUrl] = useState('');
  const [optDImageUrl, setOptDImageUrl] = useState('');
  const [showOptionImages, setShowOptionImages] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMetaData();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [subjectFilter, topicFilter, difficultyFilter]);

  const loadMetaData = async () => {
    try {
      const [subs, tops] = await Promise.all([api.getSubjects(), api.getTopics()]);
      setSubjects(subs);
      setTopics(tops);
      if (subs.length > 0 && !subjectId) {
        setSubjectId(subs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await api.getQuestions({
        subject_id: subjectFilter,
        topic_id: topicFilter,
        difficulty: difficultyFilter,
        search
      });
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
  };

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedQuestion(null);
    setQCode(`Q${Date.now().toString().slice(-5)}`);
    setSubjectId(subjects[0]?.id || '');
    setTopicId('');
    setDifficulty('medium');
    setQEn('');
    setQHi('');
    setOptAEn('');
    setOptAHi('');
    setOptBEn('');
    setOptBHi('');
    setOptCEn('');
    setOptCHi('');
    setOptDEn('');
    setOptDHi('');
    setCorrectAnswer('A');
    setMarks('1.0');
    setNegativeMarks('0.25');
    setExplanation('');
    setImageUrl('');
    setOptAImageUrl('');
    setOptBImageUrl('');
    setOptCImageUrl('');
    setOptDImageUrl('');
    setShowOptionImages(false);
    setFormError(null);
    setShowFormModal(true);
  };

  const openEditModal = (q: Question) => {
    setIsEditing(true);
    setSelectedQuestion(q);
    setQCode(q.question_id_code);
    setSubjectId(q.subject_id);
    setTopicId(q.topic_id || '');
    setDifficulty(q.difficulty);
    setQEn(q.question_en);
    setQHi(q.question_hi || '');
    setOptAEn(q.option_a_en);
    setOptAHi(q.option_a_hi || '');
    setOptBEn(q.option_b_en);
    setOptBHi(q.option_b_hi || '');
    setOptCEn(q.option_c_en);
    setOptCHi(q.option_c_hi || '');
    setOptDEn(q.option_d_en);
    setOptDHi(q.option_d_hi || '');
    setCorrectAnswer(q.correct_answer);
    setMarks(String(q.marks));
    setNegativeMarks(String(q.negative_marks));
    setExplanation(q.explanation || '');
    setImageUrl(q.image_url || '');
    setOptAImageUrl(q.option_a_image_url || '');
    setOptBImageUrl(q.option_b_image_url || '');
    setOptCImageUrl(q.option_c_image_url || '');
    setOptDImageUrl(q.option_d_image_url || '');
    setShowOptionImages(Boolean(q.option_a_image_url || q.option_b_image_url || q.option_c_image_url || q.option_d_image_url));
    setFormError(null);
    setShowFormModal(true);
  };

  const openPreviewModal = (q: Question) => {
    setSelectedQuestion(q);
    setPreviewLanguage('en');
    setShowPreviewModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      question_id_code: qCode,
      subject_id: subjectId,
      topic_id: topicId || null,
      difficulty,
      question_en: qEn,
      question_hi: qHi,
      option_a_en: optAEn,
      option_a_hi: optAHi,
      option_b_en: optBEn,
      option_b_hi: optBHi,
      option_c_en: optCEn,
      option_c_hi: optCHi,
      option_d_en: optDEn,
      option_d_hi: optDHi,
      correct_answer: correctAnswer,
      marks: parseFloat(marks) || 1.0,
      negative_marks: parseFloat(negativeMarks) || 0.25,
      explanation,
      image_url: imageUrl.trim() || null,
      option_a_image_url: optAImageUrl.trim() || null,
      option_b_image_url: optBImageUrl.trim() || null,
      option_c_image_url: optCImageUrl.trim() || null,
      option_d_image_url: optDImageUrl.trim() || null
    };

    try {
      if (isEditing && selectedQuestion) {
        await api.updateQuestion(selectedQuestion.id, payload);
      } else {
        await api.createQuestion(payload);
      }
      setShowFormModal(false);
      loadQuestions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  // In-app Delete Confirmation State (No browser window.confirm)
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteQuestion(questionToDelete.id);
      setSelectedBatchIds((prev) => prev.filter((id) => id !== questionToDelete.id));
      setQuestionToDelete(null);
      loadQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedBatchIds.length === 0) return;
    setIsDeleting(true);
    try {
      await api.batchDeleteQuestions(selectedBatchIds);
      setShowBatchDeleteModal(false);
      setSelectedBatchIds([]);
      loadQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete selected questions');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (q: Question) => {
    setQuestionToDelete(q);
  };

  // Filter topics for the currently selected subject in form
  const availableTopicsForSubject = topics.filter((t) => t.subject_id === subjectId);

  // Batch Selection State
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchTargetSubjectId, setBatchTargetSubjectId] = useState<string>('');
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

  const toggleSelectAll = () => {
    if (selectedBatchIds.length === questions.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(questions.map((q) => q.id));
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchReassignSubject = async () => {
    if (selectedBatchIds.length === 0 || !batchTargetSubjectId) return;
    setIsUpdatingBatch(true);
    try {
      const res = await api.batchUpdateSubject(selectedBatchIds, batchTargetSubjectId);
      alert(`Successfully moved ${res.updated_count} questions to "${res.subject_name}"`);
      setSelectedBatchIds([]);
      loadQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to update questions subject');
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Question Bank</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bilingual repository of examination questions, options, answer keys, and solutions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToAIUpload && (
            <button
              onClick={onNavigateToAIUpload}
              className="min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>✨ AI Smart Auto-Organizer</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Question</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1 min-w-[260px] max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search question text or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Subject filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Difficulty filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="min-h-[40px] px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button
              onClick={loadQuestions}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="Refresh questions"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Subject Tabs with Question Counts - Mobile Scrollable */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto scrollbar-none flex-nowrap pb-1">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center space-x-1 shrink-0">
            <Layers className="w-3.5 h-3.5" />
            <span>Subjects:</span>
          </span>
          <button
            type="button"
            onClick={() => setSubjectFilter('all')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center space-x-1.5 ${
              subjectFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
            }`}
          >
            <span>All Questions</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              subjectFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {subjects.reduce((sum, s) => sum + (s.question_count || 0), 0) || questions.length}
            </span>
          </button>
          {subjects.map((sub) => {
            const count = sub.question_count !== undefined ? sub.question_count : questions.filter((q) => q.subject_id === sub.id).length;
            const isSelected = subjectFilter === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubjectFilter(sub.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                }`}
              >
                <span>{sub.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch Action Toolbar when questions are selected */}
      {selectedBatchIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center space-x-2 font-black text-indigo-900">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>{selectedBatchIds.length} question(s) selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold">Change Subject to:</span>
            <select
              value={batchTargetSubjectId}
              onChange={(e) => setBatchTargetSubjectId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Target Subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              type="button"
              disabled={!batchTargetSubjectId || isUpdatingBatch}
              onClick={handleBatchReassignSubject}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isUpdatingBatch ? 'Updating...' : 'Move Questions'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBatchDeleteModal(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedBatchIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBatchIds([])}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedBatchIds.length === questions.length && questions.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select / Deselect all"
                  />
                </th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-6 py-3.5">Question Text</th>
                <th className="px-6 py-3.5">Subject / Topic</th>
                <th className="px-6 py-3.5">Difficulty</th>
                <th className="px-6 py-3.5">Answer</th>
                <th className="px-6 py-3.5">Marks</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading questions...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No questions found. Click "Add New Question" or use "Bulk Upload" to import.
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const isChecked = selectedBatchIds.includes(q.id);
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-50/70 transition ${isChecked ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="px-4 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectQuestion(q.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-slate-900">
                        {q.question_id_code}
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        <div className="font-bold text-slate-900 line-clamp-2">{q.question_en}</div>
                        {q.question_hi && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {q.question_hi}
                          </div>
                        )}
                        {q.image_url && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <ImageIcon className="w-2.5 h-2.5 text-blue-600" />
                              <span>Diagram Attached</span>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">{q.subject_name || 'General'}</span>
                        <span className="text-[11px] text-slate-400 block">{q.topic_name || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          q.difficulty === 'easy'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.difficulty === 'hard'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold inline-flex items-center justify-center text-xs">
                        {q.correct_answer}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">+{q.marks}</span>
                      <span className="text-slate-400 text-[10px] block">-{q.negative_marks}</span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => openPreviewModal(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Student CBT Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit Question"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. ADD / EDIT QUESTION MODAL (Bilingual Inputs) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                {isEditing ? `Edit Question (${qCode})` : 'Add New Question'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Meta row: Code, Subject, Topic, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Question Code *</label>
                  <input
                    type="text"
                    required
                    value={qCode}
                    onChange={(e) => setQCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      setTopicId('');
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Topic</label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- General Topic --</option>
                    {availableTopicsForSubject.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Question Text in English & Hindi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Question Text (English) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={qEn}
                    onChange={(e) => setQEn(e.target.value)}
                    placeholder="Enter question statement in English..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Question Text (Hindi Translation) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={qHi}
                    onChange={(e) => setQHi(e.target.value)}
                    placeholder="Enter Hindi translation (optional)..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* 4 Options (A, B, C, D) Side-by-Side English & Hindi */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Answer Options (English & Hindi)
                </h4>

                {/* Option A */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div className="relative">
                    <span className="w-6 h-6 rounded-md bg-slate-200 font-bold text-xs flex items-center justify-center absolute left-2 top-2 text-slate-700">
                      A
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Option A (English) *"
                      value={optAEn}
                      onChange={(e) => setOptAEn(e.target.value)}
                      className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Option A (Hindi translation)"
                      value={optAHi}
                      onChange={(e) => setOptAHi(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Option B */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div className="relative">
                    <span className="w-6 h-6 rounded-md bg-slate-200 font-bold text-xs flex items-center justify-center absolute left-2 top-2 text-slate-700">
                      B
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Option B (English) *"
                      value={optBEn}
                      onChange={(e) => setOptBEn(e.target.value)}
                      className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Option B (Hindi translation)"
                      value={optBHi}
                      onChange={(e) => setOptBHi(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Option C */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div className="relative">
                    <span className="w-6 h-6 rounded-md bg-slate-200 font-bold text-xs flex items-center justify-center absolute left-2 top-2 text-slate-700">
                      C
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Option C (English) *"
                      value={optCEn}
                      onChange={(e) => setOptCEn(e.target.value)}
                      className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Option C (Hindi translation)"
                      value={optCHi}
                      onChange={(e) => setOptCHi(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Option D */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div className="relative">
                    <span className="w-6 h-6 rounded-md bg-slate-200 font-bold text-xs flex items-center justify-center absolute left-2 top-2 text-slate-700">
                      D
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Option D (English) *"
                      value={optDEn}
                      onChange={(e) => setOptDEn(e.target.value)}
                      className="w-full pl-10 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Option D (Hindi translation)"
                      value={optDHi}
                      onChange={(e) => setOptDHi(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Scoring and Correct Option */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 border border-slate-200 rounded-xl text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Correct Answer *</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setCorrectAnswer(letter)}
                        className={`py-1.5 rounded-lg font-bold border transition ${
                          correctAnswer === letter
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Marks (+)</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Negative Penalty (-)</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={negativeMarks}
                    onChange={(e) => setNegativeMarks(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Solution Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Explanation / Solution Guide
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Provide step-by-step reasoning shown to students after test completion..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              {/* Image & Diagram Section (Google Drive Storage - Zero Firebase Storage) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <DriveImageUploader
                  label="Question Diagram / Image (Direct Google Drive Upload)"
                  value={imageUrl}
                  onChange={setImageUrl}
                  helperText="Upload any diagram, graph, or formula image. It will be stored in your Google Drive 'Pariksha CBT Exam Images' folder with public view permission — consuming 0 bytes of Firebase Storage."
                />

                {/* Option Diagrams (A, B, C, D) Expandable Section */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowOptionImages(!showOptionImages)}
                    className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span>Option Choice Diagrams (A, B, C, D) - Upload to Google Drive</span>
                    </span>
                    {showOptionImages ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {showOptionImages && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-white border border-slate-200 rounded-xl animate-in fade-in duration-150">
                      <DriveImageUploader
                        label="Option A Diagram"
                        value={optAImageUrl}
                        onChange={setOptAImageUrl}
                        compact
                      />
                      <DriveImageUploader
                        label="Option B Diagram"
                        value={optBImageUrl}
                        onChange={setOptBImageUrl}
                        compact
                      />
                      <DriveImageUploader
                        label="Option C Diagram"
                        value={optCImageUrl}
                        onChange={setOptCImageUrl}
                        compact
                      />
                      <DriveImageUploader
                        label="Option D Diagram"
                        value={optDImageUrl}
                        onChange={setOptDImageUrl}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="min-h-[44px] px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : isEditing ? 'Update Question' : 'Add to Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. REALISTIC CBT QUESTION PREVIEW MODAL */}
      {showPreviewModal && selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Student CBT Preview
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedQuestion.question_id_code}
                </span>
              </div>

              {/* Language toggle */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                  <button
                    onClick={() => setPreviewLanguage('en')}
                    className={`px-2 py-1 rounded font-bold transition ${
                      previewLanguage === 'en' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setPreviewLanguage('hi')}
                    className={`px-2 py-1 rounded font-bold transition ${
                      previewLanguage === 'hi' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    Hindi
                  </button>
                </div>
                <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-5">
              <div className="text-sm font-bold text-slate-900 leading-relaxed">
                {previewLanguage === 'hi' && selectedQuestion.question_hi?.trim()
                  ? selectedQuestion.question_hi
                  : selectedQuestion.question_en}
              </div>
              {selectedQuestion.image_url && (
                <div className="mt-3 p-2 bg-slate-50 border rounded-lg max-w-sm">
                  <img src={selectedQuestion.image_url} alt="Question" className="max-h-48 rounded" />
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2.5 mb-5">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const isCorrect = selectedQuestion.correct_answer === letter;
                let optText = (selectedQuestion as any)[`option_${letter.toLowerCase()}_en`];
                if (previewLanguage === 'hi') {
                  const hi = (selectedQuestion as any)[`option_${letter.toLowerCase()}_hi`];
                  if (hi && hi.trim()) optText = hi;
                }

                return (
                  <div
                    key={letter}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center font-bold text-xs shrink-0">
                        {letter}
                      </span>
                      <span>{optText}</span>
                    </div>
                    {isCorrect && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase">
                        Correct Answer Key
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Solution preview */}
            {selectedQuestion.explanation && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 mb-4">
                <strong>Solution Explanation:</strong> {selectedQuestion.explanation}
              </div>
            )}

            <div className="text-right">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Question Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(questionToDelete)}
        title="Delete Question"
        message={`Are you sure you want to permanently delete question "${questionToDelete?.question_id_code}"? This will remove it from all tests and records.`}
        confirmText="Yes, Delete Question"
        loading={isDeleting}
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setQuestionToDelete(null)}
      />

      {/* Batch Questions Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBatchDeleteModal}
        title="Delete Selected Questions"
        message={`Are you sure you want to permanently delete ${selectedBatchIds.length} selected question(s)? This action cannot be undone.`}
        confirmText={`Yes, Delete ${selectedBatchIds.length} Questions`}
        loading={isDeleting}
        onConfirm={confirmBatchDelete}
        onCancel={() => setShowBatchDeleteModal(false)}
      />
    </div>
  );
};
