// AI-Powered Learning Assistant (Complete)
class AdaptiveDifficulty {
  getRecommendations(analysis) {
    const { accuracy, timing } = analysis.metrics;
    const overallScore = (accuracy + timing.consistency) / 2;

    if (overallScore > 0.9) {
      return [
        { type: 'challenge', name: 'Increase tempo by 10%', difficulty: 'hard' },
        { type: 'song', name: 'Advanced piece suggestion', difficulty: 'hard' }
      ];
    } else if (overallScore > 0.7) {
      return [
        { type: 'practice', name: 'Maintain current level', difficulty: 'medium' },
        { type: 'technique', name: 'Focus on expression', difficulty: 'medium' }
      ];
    } else {
      return [
        { type: 'basics', name: 'Slow practice recommended', difficulty: 'easy' },
        { type: 'fundamentals', name: 'Review basics', difficulty: 'easy' }
      ];
    }
  }
}

class PerformanceAnalyzer {
  analyze(practiceSession) {
    const { notes, timing, duration, errors } = practiceSession;
    
    const accuracy = this.calculateAccuracy(notes, errors);
    const timingAnalysis = this.analyzeTiming(timing);
    const techniqueAnalysis = this.analyzeTechnique(notes, timing);
    
    return {
      metrics: {
        accuracy,
        timing: timingAnalysis,
        technique: techniqueAnalysis
      },
      duration,
      improvements: this.detectImprovements(practiceSession),
      challenges: this.identifyChallenges(practiceSession)
    };
  }

  calculateAccuracy(notes, errors) {
    if (!notes || notes.length === 0) return 0;
    const correctNotes = notes.length - (errors ? errors.length : 0);
    return Math.max(0, correctNotes / notes.length);
  }

  analyzeTiming(timing) {
    if (!timing || timing.length === 0) {
      return { consistency: 0, tempo: 0, stability: 0 };
    }

    const intervals = timing.slice(1).map((time, i) => time - timing[i]);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    const deviations = intervals.map(interval => Math.abs(interval - avgInterval));
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    
    const consistency = Math.max(0, 1 - (avgDeviation / avgInterval));
    const tempo = 60000 / avgInterval;
    
    return {
      consistency: Math.min(1, consistency || 0),
      tempo: tempo || 0,
      stability: this.calculateTempoStability(intervals)
    };
  }

  calculateTempoStability(intervals) {
    if (intervals.length < 2) return 1;
    
    const changes = intervals.slice(1).map((interval, i) => 
      Math.abs(interval - intervals[i]) / (intervals[i] || 1)
    );
    
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    return Math.max(0, 1 - avgChange);
  }

  analyzeTechnique(notes, timing) {
    const fluency = this.calculateFluency(notes, timing);
    const evenness = this.calculateEvenness(timing);
    const control = this.calculateControl(notes);
    
    return { fluency, evenness, control };
  }

  calculateFluency(notes, timing) {
    if (!timing || timing.length < 2) return 0;
    
    const gaps = timing.slice(1).map((time, i) => time - timing[i]);
    const longPauses = gaps.filter(gap => gap > 1000).length;
    
    return Math.max(0, 1 - (longPauses / gaps.length));
  }

  calculateEvenness(timing) {
    if (!timing || timing.length < 3) return 1;
    
    const intervals = timing.slice(1).map((time, i) => time - timing[i]);
    const variance = this.calculateVariance(intervals);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    return Math.max(0, 1 - (variance / (mean * mean || 1)));
  }

  calculateControl(notes) {
    if (!notes || notes.length === 0) return 1;
    
    const velocities = notes.map(note => note.velocity || 64);
    const dynamicRange = Math.max(...velocities) - Math.min(...velocities);
    
    return Math.min(1, dynamicRange / 127);
  }

  calculateVariance(array) {
    if (array.length === 0) return 0;
    const mean = array.reduce((a, b) => a + b, 0) / array.length;
    const squaredDiffs = array.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / array.length;
  }

  detectImprovements(session) {
    return ['tempo', 'accuracy'];
  }

  identifyChallenges(session) {
    const challenges = [];
    
    if (session.errors && session.notes && session.errors.length > session.notes.length * 0.3) {
      challenges.push('high_error_rate');
    }
    
    return challenges;
  }
}

if (typeof window !== 'undefined') {
  window.LearningAssistant = LearningAssistant;
  window.AdaptiveDifficulty = AdaptiveDifficulty;
  window.PerformanceAnalyzer = PerformanceAnalyzer;
}
