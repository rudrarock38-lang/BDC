import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Subject, Topic } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  BookOpen,
  FolderPlus,
  Plus,
  Edit2,
  Trash2,
  X,
  RotateCcw,
  CheckCircle2,
  Layers
} from 'lucide-react';

export const SubjectsTopics: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Subject Modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subDesc, setSubDesc] = useState('');

  // Topic Modal
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [subs, tops] = await Promise.all([api.getSubjects(), api.getTopics()]);
      setSubjects(subs);
      setTopics(tops);
      if (subs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddSub = () => {
    setIsEditingSub(false);
    setSubName('');
    setSubCode('');
    setSubDesc('');
    setShowSubModal(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditingSub) {
        await api.updateSubject(selectedSubjectId, { name: subName, code: subCode, description: subDesc });
      } else {
        const created = await api.createSubject({ name: subName, code: subCode, description: subDesc });
        setSelectedSubjectId(created.id);
      }
      setShowSubModal(false);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save subject');
    }
  };

  // In-app Delete Confirmation States
  const [subToDelete, setSubToDelete] = useState<{ id: string; name: string } | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteSubject = async () => {
    if (!subToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteSubject(subToDelete.id);
      if (selectedSubjectId === subToDelete.id) {
        setSelectedSubjectId('');
      }
      setSubToDelete(null);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteTopic(topicToDelete.id);
      setTopicToDelete(null);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete topic');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSub = (id: string, name: string) => {
    setSubToDelete({ id, name });
  };

  const handleOpenAddTopic = () => {
    setIsEditingTopic(false);
    setSelectedTopic(null);
    setTopicName('');
    setTopicDesc('');
    setShowTopicModal(true);
  };

  const handleOpenEditTopic = (t: Topic) => {
    setIsEditingTopic(true);
    setSelectedTopic(t);
    setTopicName(t.name);
    setTopicDesc(t.description || '');
    setShowTopicModal(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;
    try {
      if (isEditingTopic && selectedTopic) {
        await api.updateTopic(selectedTopic.id, { name: topicName, description: topicDesc });
      } else {
        await api.createTopic({ subject_id: selectedSubjectId, name: topicName, description: topicDesc });
      }
      setShowTopicModal(false);
      loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to save topic');
    }
  };

  const handleDeleteTopic = (t: Topic) => {
    setTopicToDelete(t);
  };

  const filteredTopics = topics.filter((t) => t.subject_id === selectedSubjectId);
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subjects & Topics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize questions into structured examination disciplines and sub-topics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenAddSub}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* Two-Column Layout: Subjects on Left, Topics on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Subjects List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Subjects ({subjects.length})</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No subjects created yet.</div>
            ) : (
              subjects.map((sub) => {
                const isSelected = sub.id === selectedSubjectId;
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubjectId(sub.id)}
                    className={`p-4 cursor-pointer transition flex items-center justify-between ${
                      isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{sub.name}</div>
                      <div className="text-[11px] text-slate-400 space-x-2 mt-0.5">
                        {sub.code && <span className="font-mono">{sub.code} •</span>}
                        <span>{sub.question_count || 0} Questions</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubjectId(sub.id);
                          setSubName(sub.name);
                          setSubCode(sub.code || '');
                          setSubDesc(sub.description || '');
                          setIsEditingSub(true);
                          setShowSubModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Subject"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSub(sub.id, sub.name);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Topics for selected subject */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Topics in {activeSubject?.name || 'Selected Subject'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeSubject?.description || 'No description provided'}
              </p>
            </div>

            {selectedSubjectId && (
              <button
                onClick={handleOpenAddTopic}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center space-x-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic</span>
              </button>
            )}
          </div>

          <div className="p-4">
            {filteredTopics.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No topics added under this subject yet. Click "+ Add Topic" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTopics.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-xs text-slate-900">{t.name}</h4>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditTopic(t)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            title="Edit Topic"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(t)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {t.description || 'General topic module'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
                      {t.question_count || 0} Questions Assigned
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUBJECT MODAL */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {isEditingSub ? 'Edit Subject' : 'Add New Subject'}
              </h3>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="e.g. General Science"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  placeholder="e.g. SCI-01"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  placeholder="Description of the subject curriculum..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-xs font-bold rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOPIC MODAL */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {isEditingTopic ? 'Edit Topic' : 'Add Topic to Subject'}
              </h3>
              <button onClick={() => setShowTopicModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topic Name *</label>
                <input
                  type="text"
                  required
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g. Modern Indian History"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Key concepts or syllabus scope..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-xs font-bold rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(subToDelete)}
        title="Delete Subject"
        message={`Are you sure you want to delete subject "${subToDelete?.name}"? All topics under this subject will also be deleted.`}
        confirmText="Yes, Delete Subject"
        loading={isDeleting}
        onConfirm={confirmDeleteSubject}
        onCancel={() => setSubToDelete(null)}
      />

      {/* Delete Topic Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(topicToDelete)}
        title="Delete Topic"
        message={`Are you sure you want to delete topic "${topicToDelete?.name}"?`}
        confirmText="Yes, Delete Topic"
        loading={isDeleting}
        onConfirm={confirmDeleteTopic}
        onCancel={() => setTopicToDelete(null)}
      />
    </div>
  );
};
