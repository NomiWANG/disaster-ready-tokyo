import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../languages';
import { useGamification } from '../context/GamificationContext';
import { useTheme } from '../context/ThemeContext';
import quizData from '../data/quiz_questions.json';

/**
 * 统一题目格式：所有题目使用相同的 options + correctAnswer 结构
 * 移除之前混乱的 choices/answers/optionA-optionD 等多种格式
 */
const normalizeQuestions = (data) => {
  return data.questions.map((q) => ({
    id: q.id,
    topic: q.topic || 'general',
    questionKey: q.questionKey,
    options: q.options.map((opt, idx) => ({
      id: opt.id || String.fromCharCode(97 + idx),
      key: opt.key,
    })),
    correctAnswer: q.correctAnswer,
    explanationKey: q.explanationKey,
    difficulty: q.difficulty || 'medium',
    points: q.points || 10,
    tags: q.tags || [],
  }));
};

const getRandomizedQuestions = (questions, count = 7) => {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export default function QuizScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { addPoints } = useGamification();
  const styles = useMemo(() => createStyles(theme, fontScale), [theme, fontScale]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const normalized = normalizeQuestions(quizData);
    const randomized = getRandomizedQuestions(normalized, 7);
    setQuestions(randomized);
  }, []);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = questions.length > 0 && currentQuestionIndex === questions.length - 1;

  const handleAnswerSelect = (answerId) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerId);
    const isCorrect = answerId === currentQuestion.correctAnswer;

    if (isCorrect) {
      setScore(score + 1);
    }

    setAnsweredQuestions([...answeredQuestions, {
      questionId: currentQuestion.id,
      selectedAnswer: answerId,
      isCorrect,
    }]);
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      const finalScore = selectedAnswer === currentQuestion.correctAnswer ? score + 1 : score;
      setScore(finalScore);
      setShowResult(true);

      const isPerfect = finalScore === questions.length;

      if (isPerfect && !pointsAwarded) {
        setPointsAwarded(true);
        try {
          await addPoints('quiz_perfect', 50, { score: finalScore, total: questions.length });
        } catch (error) {
          console.error('Failed to award points:', error);
        }
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }
  };

  const handleRestart = () => {
    const normalized = normalizeQuestions(quizData);
    const randomized = getRandomizedQuestions(normalized, 7);
    setQuestions(randomized);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setAnsweredQuestions([]);
    setPointsAwarded(false);
  };

  const renderQuestion = () => {
    if (questions.length === 0) {
      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>Loading...</Text>
        </View>
      );
    }

    if (showResult) {
      const finalScore = score;
      const percentage = Math.round((finalScore / questions.length) * 100);
      const isPerfect = finalScore === questions.length;
      
      return (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>{t('quiz.result.title')}</Text>
          <Text style={styles.resultScore}>
            {finalScore} / {questions.length}
          </Text>
          <Text style={styles.resultPercentage}>{percentage}%</Text>
          <Text style={styles.resultMessage}>
            {percentage >= 80
              ? t('quiz.result.excellent')
              : percentage >= 60
              ? t('quiz.result.good')
              : t('quiz.result.needsImprovement')}
          </Text>
          {isPerfect && (
            <View style={styles.perfectBonus}>
              <Text style={styles.perfectBonusText}>
                {t('quiz.result.perfectBonus').replace('{points}', '50')}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
            <Text style={styles.restartButtonText}>{t('quiz.result.restart')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.questionContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.questionNumber}>
          {t('quiz.questionNumber').replace('{current}', currentQuestionIndex + 1).replace('{total}', questions.length)}
        </Text>
        <Text style={styles.questionText}>{t(currentQuestion.questionKey)}</Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = option.id === currentQuestion.correctAnswer;
            const showCorrect = selectedAnswer !== null && isCorrect;
            const showIncorrect = isSelected && !isCorrect;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                  showCorrect && styles.optionButtonCorrect,
                  showIncorrect && styles.optionButtonIncorrect,
                ]}
                onPress={() => handleAnswerSelect(option.id)}
                disabled={selectedAnswer !== null}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                    showCorrect && styles.optionTextCorrect,
                    showIncorrect && styles.optionTextIncorrect,
                  ]}
                >
                  {String.fromCharCode(65 + option.id.charCodeAt(0) - 97)}. {t(option.key)}
                </Text>
                {showCorrect && <Text style={styles.correctMark}>[x]</Text>}
                {showIncorrect && <Text style={styles.incorrectMark}>[ ]</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedAnswer !== null && (
          <View style={styles.explanationContainer}>
            <Text style={styles.explanationTitle}>{t('quiz.explanation')}</Text>
            <Text style={styles.explanationText}>
              {t(currentQuestion.explanationKey)}
            </Text>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? t('quiz.viewResult') : t('common.next')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {!showResult && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>{renderQuestion()}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme, fontScale = 1.0) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F5F5F5',
  },
  header: {
    backgroundColor: theme?.card || '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E5E5EA',
    paddingBottom: 10,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16 * fontScale,
    color: theme?.primary || '#1976D2',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  questionContainer: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme?.surfaceSecondary || '#E5E5EA',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme?.primary || '#1976D2',
    borderRadius: 3,
  },
  questionNumber: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#666',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 20 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 24,
    lineHeight: 28 * fontScale,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: theme?.surface || '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: theme?.primary || '#1976D2',
    backgroundColor: theme?.primaryLight || '#E3F2FD',
  },
  optionButtonCorrect: {
    borderColor: theme?.success || '#4CAF50',
    backgroundColor: theme?.success ? 'rgba(76, 175, 80, 0.2)' : '#E8F5E9',
  },
  optionButtonIncorrect: {
    borderColor: theme?.error || '#F44336',
    backgroundColor: theme?.error ? 'rgba(244, 67, 54, 0.2)' : '#FFEBEE',
  },
  optionText: {
    fontSize: 16 * fontScale,
    color: theme?.text || '#000',
    flex: 1,
  },
  optionTextSelected: {
    color: theme?.primary || '#1976D2',
    fontWeight: '500',
  },
  optionTextCorrect: {
    color: theme?.success || '#4CAF50',
    fontWeight: '600',
  },
  optionTextIncorrect: {
    color: theme?.error || '#F44336',
    fontWeight: '600',
  },
  correctMark: {
    fontSize: 20 * fontScale,
    color: theme?.success || '#4CAF50',
    fontWeight: 'bold',
  },
  incorrectMark: {
    fontSize: 20 * fontScale,
    color: theme?.error || '#F44336',
    fontWeight: 'bold',
  },
  explanationContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme?.border || '#E5E5EA',
  },
  explanationTitle: {
    fontSize: 16 * fontScale,
    fontWeight: '600',
    color: theme?.text || '#000',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14 * fontScale,
    color: theme?.textSecondary || '#666',
    lineHeight: 20 * fontScale,
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: theme?.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: theme?.textOnPrimary || '#FFFFFF',
    fontSize: 16 * fontScale,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: theme?.card || '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 24 * fontScale,
    fontWeight: 'bold',
    color: theme?.text || '#000',
    marginBottom: 20,
  },
  resultScore: {
    fontSize: 48 * fontScale,
    fontWeight: 'bold',
    color: theme?.primary || '#1976D2',
    marginBottom: 8,
  },
  resultPercentage: {
    fontSize: 32 * fontScale,
    fontWeight: '600',
    color: theme?.textSecondary || '#666',
    marginBottom: 20,
  },
  resultMessage: {
    fontSize: 18 * fontScale,
    color: theme?.textSecondary || '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  restartButton: {
    backgroundColor: theme?.primary || '#1976D2',
    borderRadius: 8,
    padding: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 16 * fontScale,
    fontWeight: '600',
  },
  perfectBonus: {
    backgroundColor: theme?.warning || '#FFD700',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  perfectBonusText: {
    color: theme?.text || '#000',
    fontSize: 16 * fontScale,
    fontWeight: '600',
  },
});

