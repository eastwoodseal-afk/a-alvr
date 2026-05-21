"use client";
import { useState, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

interface InteractionProps {
  shotId: string;
  userId?: string;
  initialIsLiked: boolean;
  initialIsSaved: boolean;
  initialLikesCount: number;
  initialViewsCount: number;
  onLikeChange?: (newIsLiked: boolean, newCount: number) => void;
  onSaveChange?: (newIsSaved: boolean) => void;
}

export function useShotInteractions({
  shotId,
  userId,
  initialIsLiked,
  initialIsSaved,
  initialLikesCount,
  initialViewsCount,
  onLikeChange,
  onSaveChange,
}: InteractionProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [viewsCount, setViewsCount] = useState(initialViewsCount);
  
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hasIncremented = useRef(false);

  const handleLike = useCallback(async () => {
    if (!userId || isLiking) return;
    setIsLiking(true);
    
    const alreadyLiked = isLiked;
    
    const newIsLiked = !alreadyLiked;
    const newCount = alreadyLiked ? likesCount - 1 : likesCount + 1;
    setIsLiked(newIsLiked);
    setLikesCount(newCount);

    try {
      if (alreadyLiked) {
        await supabase.from("likes").delete().match({ user_id: userId, shot_id: shotId });
      } else {
        await supabase.from("likes").insert({ user_id: userId, shot_id: shotId });
      }
      if (onLikeChange) onLikeChange(newIsLiked, newCount);
      
    } catch (err) {
      setIsLiked(alreadyLiked);
      setLikesCount(likesCount);
    } finally {
      setIsLiking(false);
    }
  }, [userId, shotId, isLiked, likesCount, isLiking, onLikeChange]);

  const handleSave = useCallback(async () => {
    if (!userId || isSaving || isSaved) return;
    setIsSaving(true);

    try {
      await supabase.from("saved_shots").insert({ user_id: userId, shot_id: shotId });
      setIsSaved(true);
      if (onSaveChange) onSaveChange(true);
    } catch (err) {
      console.error("Error al guardar", err);
    } finally {
      setIsSaving(false);
    }
  }, [userId, shotId, isSaved, isSaving, onSaveChange]);

  const handleView = useCallback(async () => {
    if (hasIncremented.current) return;
    hasIncremented.current = true;
    
    try {
      await supabase.rpc('increment_view', { shot_id: parseInt(shotId) });
      setViewsCount(prev => prev + 1);
    } catch (err) {
      console.error("Error al contar vista", err);
    }
  }, [shotId]);

  return {
    isLiked, likesCount, isLiking, handleLike,
    isSaved, isSaving, handleSave,
    viewsCount, handleView,
    // 🆕 EXPUESTOS PARA SINCRONIZACIÓN EXTERNA (RPC)
    setIsLiked, setIsSaved, setLikesCount, setViewsCount
  };
}