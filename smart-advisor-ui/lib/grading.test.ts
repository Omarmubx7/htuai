import { describe, it, expect } from 'vitest';
import {
  GRADE_MAP,
  SCORED_GRADES,
  MIN_PASS_POINTS,
  CUMULATIVE_CLASSIFICATIONS,
  gradeToPoints,
  calculateSemesterGpa,
  calculateGPA,
  getClassification,
} from '../lib/grading';

describe('GRADE_MAP', () => {
  it('should have correct grade definitions', () => {
    expect(GRADE_MAP.D).toEqual({ label: 'Distinction', points: 4, colorKey: 'emerald' });
    expect(GRADE_MAP.M).toEqual({ label: 'Merit', points: 3.2, colorKey: 'blue' });
    expect(GRADE_MAP.P).toEqual({ label: 'Pass', points: 2.4, colorKey: 'amber' });
    expect(GRADE_MAP.U).toEqual({ label: 'Unclassified', points: 0, colorKey: 'red' });
  });

  it('should have non-scored grades with 0 points', () => {
    expect(GRADE_MAP.WF.points).toBe(0);
    expect(GRADE_MAP.TC.points).toBe(0);
    expect(GRADE_MAP.X.points).toBe(0);
  });

  it('should have all grades with valid color keys', () => {
    const validColors = ['emerald', 'blue', 'amber', 'red', 'gray', 'violet'];
    Object.values(GRADE_MAP).forEach((grade) => {
      expect(validColors).toContain(grade.colorKey);
    });
  });
});

describe('SCORED_GRADES', () => {
  it('should only include grades that count toward GPA', () => {
    expect(SCORED_GRADES).toEqual(['D', 'M', 'P', 'U']);
  });

  it('should not include transfer or withdrawn grades', () => {
    expect(SCORED_GRADES).not.toContain('TC');
    expect(SCORED_GRADES).not.toContain('WF');
    expect(SCORED_GRADES).not.toContain('X');
  });
});

describe('MIN_PASS_POINTS', () => {
  it('should be 2.4 (Pass grade threshold)', () => {
    expect(MIN_PASS_POINTS).toBe(2.4);
  });
});

describe('CUMULATIVE_CLASSIFICATIONS', () => {
  it('should have 5 classification tiers', () => {
    expect(CUMULATIVE_CLASSIFICATIONS).toHaveLength(5);
  });

  it('should have non-overlapping ranges in descending order', () => {
    for (let i = 0; i < CUMULATIVE_CLASSIFICATIONS.length - 1; i++) {
      const current = CUMULATIVE_CLASSIFICATIONS[i];
      const next = CUMULATIVE_CLASSIFICATIONS[i + 1];
      
      // Current tier's min should be higher than next tier's max
      expect(current.min).toBeGreaterThan(next.max);
    }
  });

  it('should cover full GPA range from 0 to 4.0', () => {
    const highest = CUMULATIVE_CLASSIFICATIONS[0];
    const lowest = CUMULATIVE_CLASSIFICATIONS.at(-1);
    
    expect(highest.max).toBe(4);
    expect(lowest?.min).toBe(0);
  });

  it('should have correct Excellent (EX) classification', () => {
    const excellent = CUMULATIVE_CLASSIFICATIONS[0];
    expect(excellent.min).toBe(3.6);
    expect(excellent.max).toBe(4);
    expect(excellent.short).toBe('EX');
    expect(excellent.colorKey).toBe('emerald');
  });
});

describe('gradeToPoints', () => {
  it('should return correct points for valid grades', () => {
    expect(gradeToPoints('D')).toBe(4);
    expect(gradeToPoints('M')).toBe(3.2);
    expect(gradeToPoints('P')).toBe(2.4);
    expect(gradeToPoints('U')).toBe(0);
  });

  it('should return 0 for invalid grades', () => {
    expect(gradeToPoints('INVALID')).toBe(0);
    expect(gradeToPoints('')).toBe(0);
  });

  it('should return 0 for non-scored grades', () => {
    expect(gradeToPoints('WF')).toBe(0);
    expect(gradeToPoints('TC')).toBe(0);
    expect(gradeToPoints('X')).toBe(0);
  });
});

describe('calculateSemesterGpa', () => {
  it('should calculate GPA correctly for single course', () => {
    const courses = [{ grade: 'D', credits: 3 }];
    expect(calculateSemesterGpa(courses)).toBe(4);
  });

  it('should calculate weighted GPA for multiple courses', () => {
    const courses = [
      { grade: 'D', credits: 3 },  // 4.0 * 3 = 12.0
      { grade: 'M', credits: 3 },  // 3.2 * 3 = 9.6
    ];
    // Total: 21.6 / 6 = 3.6
    expect(calculateSemesterGpa(courses)).toBe(3.6);
  });

  it('should handle different credit weights correctly', () => {
    const courses = [
      { grade: 'D', credits: 4 },  // 4.0 * 4 = 16.0
      { grade: 'M', credits: 2 },  // 3.2 * 2 = 6.4
      { grade: 'P', credits: 3 },  // 2.4 * 3 = 7.2
    ];
    // Total: 29.6 / 9 = 3.2888... ≈ 3.29
    expect(calculateSemesterGpa(courses)).toBe(3.29);
  });

  it('should filter out non-scored grades (TC, WF, X)', () => {
    const courses = [
      { grade: 'D', credits: 3 },   // Counted
      { grade: 'TC', credits: 3 },  // Not counted
      { grade: 'WF', credits: 3 },  // Not counted
      { grade: 'M', credits: 3 },   // Counted
    ];
    // Total: (4.0 * 3) + (3.2 * 3) = 21.6 / 6 = 3.6
    expect(calculateSemesterGpa(courses)).toBe(3.6);
  });

  it('should return 0 for empty course list', () => {
    expect(calculateSemesterGpa([])).toBe(0);
  });

  it('should return 0 when only non-scored grades', () => {
    const courses = [
      { grade: 'TC', credits: 3 },
      { grade: 'WF', credits: 3 },
      { grade: 'X', credits: 3 },
    ];
    expect(calculateSemesterGpa(courses)).toBe(0);
  });

  it('should handle Unclassified (U) grades with 0 points', () => {
    const courses = [
      { grade: 'D', credits: 3 },  // 4.0 * 3 = 12.0
      { grade: 'U', credits: 3 },  // 0.0 * 3 = 0.0
    ];
    // Total: 12.0 / 6 = 2.0
    expect(calculateSemesterGpa(courses)).toBe(2);
  });

  it('should round to 2 decimal places', () => {
    const courses = [
      { grade: 'D', credits: 1 },   // 4.0
      { grade: 'M', credits: 1 },   // 3.2
      { grade: 'P', credits: 1 },   // 2.4
    ];
    // Total: 9.6 / 3 = 3.2 (exact)
    expect(calculateSemesterGpa(courses)).toBe(3.2);
  });

  it('should handle complex mixed grades scenario', () => {
    const courses = [
      { grade: 'D', credits: 3 },
      { grade: 'D', credits: 3 },
      { grade: 'M', credits: 4 },
      { grade: 'P', credits: 3 },
      { grade: 'U', credits: 2 },
      { grade: 'TC', credits: 3 }, // Should be filtered out
    ];
    // Scored: (4*3) + (4*3) + (3.2*4) + (2.4*3) + (0*2) = 12 + 12 + 12.8 + 7.2 + 0 = 44
    // Credits: 3 + 3 + 4 + 3 + 2 = 15
    // GPA: 44 / 15 = 2.9333... ≈ 2.93
    expect(calculateSemesterGpa(courses)).toBe(2.93);
  });
});

describe('calculateSemesterGpa (Historical Analysis)', () => {
  it('should calculate cumulative GPA across multiple semesters', () => {
    const allCourses = [
      { grade: 'D', credits: 3 },
      { grade: 'M', credits: 3 },
      { grade: 'P', credits: 3 },
      { grade: 'D', credits: 3 },
    ];
    // Total: (4*3) + (3.2*3) + (2.4*3) + (4*3) = 40.8 / 12 = 3.4
    expect(calculateSemesterGpa(allCourses)).toBe(3.4);
  });

  it('should handle large course histories', () => {
    const largeCourseList = Array.from({ length: 40 }, (_, i) => ({
      grade: i % 2 === 0 ? 'D' : 'M',
      credits: 3,
    }));
    
    // Half D (4.0), half M (3.2): average = 3.6
    expect(calculateSemesterGpa(largeCourseList)).toBe(3.6);
  });
});

describe('calculateGPA (compatibility wrapper)', () => {
  it('should call calculateSemesterGpa internally', () => {
    const courses = [
      { credits: 3, grade: 'D' },
      { credits: 3, grade: 'M' },
    ];
    
    const result = calculateGPA(courses);
    const expected = calculateSemesterGpa(courses);
    
    expect(result).toBe(expected);
  });

  it('should handle different parameter order (credits first)', () => {
    const courses = [
      { credits: 4, grade: 'D' },
      { credits: 2, grade: 'P' },
    ];
    
    // (4*4) + (2.4*2) = 20.8 / 6 = 3.4666... ≈ 3.47
    expect(calculateGPA(courses)).toBe(3.47);
  });
});

describe('getClassification', () => {
  it('should return Excellent (EX) for GPA 3.6-4.0', () => {
    expect(getClassification(4).short).toBe('EX');
    expect(getClassification(3.6).short).toBe('EX');
    expect(getClassification(3.8).short).toBe('EX');
  });

  it('should return Very Good (VG) for GPA 3.2-3.59', () => {
    expect(getClassification(3.59).short).toBe('VG');
    expect(getClassification(3.2).short).toBe('VG');
    expect(getClassification(3.4).short).toBe('VG');
  });

  it('should return Good for GPA 2.8-3.19', () => {
    expect(getClassification(3.19).short).toBe('Good');
    expect(getClassification(2.8).short).toBe('Good');
    expect(getClassification(3).short).toBe('Good');
  });

  it('should return Satisfactory (SAT) for GPA 2.4-2.79', () => {
    expect(getClassification(2.79).short).toBe('SAT');
    expect(getClassification(2.4).short).toBe('SAT');
    expect(getClassification(2.6).short).toBe('SAT');
  });

  it('should return Below Minimum (LOW) for GPA < 2.4', () => {
    expect(getClassification(2.39).short).toBe('LOW');
    expect(getClassification(2).short).toBe('LOW');
    expect(getClassification(1.5).short).toBe('LOW');
    expect(getClassification(0).short).toBe('LOW');
  });

  it('should include correct color keys', () => {
    expect(getClassification(4).colorKey).toBe('emerald');
    expect(getClassification(3.5).colorKey).toBe('blue');
    expect(getClassification(3).colorKey).toBe('violet');
    expect(getClassification(2.5).colorKey).toBe('amber');
    expect(getClassification(2).colorKey).toBe('red');
  });

  it('should include motivational messages', () => {
    const excellent = getClassification(3.8);
    expect(excellent.motivation).toBeTruthy();
    expect(excellent.motivation).toContain('Elite');
  });

  it('should handle edge cases at boundary values', () => {
    // Test exact boundary values
    expect(getClassification(3.59).short).toBe('VG');  // Upper bound of VG
    expect(getClassification(3.6).short).toBe('EX');   // Lower bound of EX
    
    expect(getClassification(3.19).short).toBe('Good'); // Upper bound of Good
    expect(getClassification(3.2).short).toBe('VG');     // Lower bound of VG
    
    expect(getClassification(2.79).short).toBe('SAT');   // Upper bound of SAT
    expect(getClassification(2.8).short).toBe('Good');   // Lower bound of Good
    
    expect(getClassification(2.39).short).toBe('LOW');   // Upper bound of LOW
    expect(getClassification(2.4).short).toBe('SAT');    // Lower bound of SAT
  });
});
