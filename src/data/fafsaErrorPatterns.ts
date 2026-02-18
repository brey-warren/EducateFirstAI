import { FAFSAErrorPattern } from '../types/errors';

// Common FAFSA error patterns based on Department of Education data
export const FAFSA_ERROR_PATTERNS: FAFSAErrorPattern[] = [
  // Student Demographics Errors
  {
    id: 'ssn_format_error',
    name: 'Invalid SSN Format',
    description: 'Social Security Number is not in the correct format',
    errorType: 'incorrect_format',
    severity: 'critical',
    section: 'student-demographics',
    field: 'ssn',
    patterns: [
      '\\d{3}-\\d{2}-\\d{4}', // Should not include dashes
      '\\d{9}', // Should be 9 digits without dashes
      'xxx-xx-xxxx',
      'no ssn',
      'none',
      'n/a'
    ],
    solution: 'Enter your 9-digit Social Security Number without dashes or spaces (e.g., 123456789)',
    commonCauses: [
      'Including dashes or spaces in SSN',
      'Using placeholder text like "XXX-XX-XXXX"',
      'Entering "N/A" or "None" instead of actual SSN'
    ],
    preventionTips: [
      'Use only numbers, no dashes or spaces',
      'Double-check your Social Security card for the correct number',
      'If you don\'t have an SSN, you may still be eligible for aid'
    ]
  },
  {
    id: 'name_mismatch',
    name: 'Name Mismatch with SSN',
    description: 'Name on FAFSA doesn\'t match Social Security records',
    errorType: 'verification_issue',
    severity: 'critical',
    section: 'student-demographics',
    field: 'name',
    patterns: [
      'nickname',
      'middle name',
      'maiden name',
      'different name',
      'name change'
    ],
    solution: 'Use your legal name exactly as it appears on your Social Security card',
    commonCauses: [
      'Using a nickname instead of legal name',
      'Including or excluding middle name inconsistently',
      'Recent name change not updated with Social Security'
    ],
    preventionTips: [
      'Check your Social Security card for the exact spelling',
      'Update your name with Social Security before filing FAFSA if recently changed',
      'Use your legal name, not nicknames or preferred names'
    ]
  },

  // Dependency Status Errors
  {
    id: 'dependency_status_confusion',
    name: 'Incorrect Dependency Status',
    description: 'Student incorrectly determined their dependency status',
    errorType: 'dependency_status_error',
    severity: 'critical',
    section: 'dependency-status',
    patterns: [
      'live with parents',
      'parents support',
      'under 24',
      'not married',
      'no children',
      'independent'
    ],
    solution: 'Answer dependency questions carefully - most undergraduate students under 24 are dependent',
    commonCauses: [
      'Thinking independence means not living with parents',
      'Confusing tax dependency with FAFSA dependency',
      'Not understanding age requirements for independence'
    ],
    preventionTips: [
      'Review all dependency questions carefully',
      'Most students under 24 are dependent unless they meet specific criteria',
      'FAFSA dependency is different from tax dependency'
    ]
  },

  // Income and Tax Errors
  {
    id: 'tax_return_mismatch',
    name: 'Tax Information Mismatch',
    description: 'FAFSA tax information doesn\'t match tax return',
    errorType: 'tax_information_error',
    severity: 'critical',
    section: 'student-finances',
    field: 'tax_info',
    patterns: [
      'estimated',
      'approximate',
      'rounded',
      'will file',
      'haven\'t filed'
    ],
    solution: 'Use exact figures from your completed tax return or W-2 forms',
    commonCauses: [
      'Using estimated or rounded numbers',
      'Filing FAFSA before completing tax return',
      'Transcribing numbers incorrectly from tax forms'
    ],
    preventionTips: [
      'Complete your tax return before filing FAFSA when possible',
      'Use the IRS Data Retrieval Tool for accuracy',
      'Double-check all tax figures against your actual forms'
    ]
  },
  {
    id: 'untaxed_income_omission',
    name: 'Missing Untaxed Income',
    description: 'Student failed to report untaxed income sources',
    errorType: 'income_reporting_error',
    severity: 'warning',
    section: 'student-finances',
    field: 'untaxed_income',
    patterns: [
      'child support',
      'social security benefits',
      'welfare',
      'unemployment',
      'disability benefits',
      'veterans benefits'
    ],
    solution: 'Report all untaxed income including benefits, child support, and other sources',
    commonCauses: [
      'Not realizing benefits count as untaxed income',
      'Forgetting about child support received',
      'Overlooking disability or veterans benefits'
    ],
    preventionTips: [
      'Review all sources of money received during the tax year',
      'Include benefits even if they weren\'t taxed',
      'Check the FAFSA instructions for complete list of untaxed income'
    ]
  },

  // Asset Reporting Errors
  {
    id: 'asset_overreporting',
    name: 'Incorrect Asset Reporting',
    description: 'Student reported assets that should be excluded',
    errorType: 'asset_reporting_error',
    severity: 'warning',
    section: 'student-finances',
    field: 'assets',
    patterns: [
      'retirement account',
      '401k',
      'ira',
      'pension',
      'primary residence',
      'home value'
    ],
    solution: 'Don\'t report retirement accounts or your primary residence as assets',
    commonCauses: [
      'Including retirement accounts like 401(k) or IRA',
      'Reporting the value of primary residence',
      'Including life insurance cash value'
    ],
    preventionTips: [
      'Only report cash, savings, and investment accounts',
      'Exclude retirement accounts and primary residence',
      'Don\'t include the value of personal possessions'
    ]
  },

  // School Selection Errors
  {
    id: 'school_code_error',
    name: 'Incorrect School Code',
    description: 'Student entered wrong federal school code',
    errorType: 'school_selection_error',
    severity: 'critical',
    section: 'school-selection',
    field: 'school_codes',
    patterns: [
      'wrong code',
      'can\'t find school',
      'school not listed',
      'incorrect code'
    ],
    solution: 'Use the Federal School Code search tool to find the correct 6-digit code',
    commonCauses: [
      'Using state school code instead of federal code',
      'Selecting wrong campus or branch',
      'Typing school code incorrectly'
    ],
    preventionTips: [
      'Use the official Federal School Code search on StudentAid.gov',
      'Verify you\'re selecting the correct campus',
      'Double-check the 6-digit code before submitting'
    ]
  },

  // Deadline and Process Errors
  {
    id: 'deadline_warning',
    name: 'FAFSA Deadline Approaching',
    description: 'Student may miss important FAFSA deadlines',
    errorType: 'deadline_warning',
    severity: 'warning',
    section: 'review-submit',
    patterns: [
      'deadline',
      'due date',
      'priority date',
      'late',
      'when is it due'
    ],
    solution: 'Submit your FAFSA as early as possible, ideally by your state and school priority dates',
    commonCauses: [
      'Not knowing state-specific deadlines',
      'Waiting too long to gather required documents',
      'Procrastinating on FAFSA completion'
    ],
    preventionTips: [
      'Check your state\'s FAFSA deadline',
      'Submit by school priority dates for maximum aid',
      'File as early as October 1st for the following school year'
    ]
  },

  // Verification and Documentation Errors
  {
    id: 'missing_signature',
    name: 'Missing Electronic Signature',
    description: 'FAFSA submitted without required signatures',
    errorType: 'missing_information',
    severity: 'critical',
    section: 'review-submit',
    field: 'signature',
    patterns: [
      'signature',
      'sign',
      'fsaid',
      'pin',
      'electronic signature'
    ],
    solution: 'Both student and parent (if dependent) must sign with FSA ID',
    commonCauses: [
      'Forgetting to sign the FAFSA',
      'Parent not signing dependent student\'s FAFSA',
      'Using wrong FSA ID credentials'
    ],
    preventionTips: [
      'Create FSA ID before starting FAFSA',
      'Both student and parent need separate FSA IDs',
      'Keep FSA ID credentials secure and accessible'
    ]
  }
];

// Section-specific checklists
export const FAFSA_SECTION_CHECKLISTS = {
  'student-demographics': [
    {
      id: 'ssn_verification',
      section: 'student-demographics',
      title: 'Verify Social Security Number',
      description: 'Ensure your SSN matches your Social Security card exactly',
      isRequired: true,
      commonMistakes: [
        'Including dashes or spaces',
        'Using placeholder numbers',
        'Transposing digits'
      ],
      tips: [
        'Check your Social Security card for the exact number',
        'Enter only the 9 digits without dashes',
        'Double-check each digit carefully'
      ]
    },
    {
      id: 'legal_name_check',
      section: 'student-demographics',
      title: 'Use Legal Name',
      description: 'Enter your name exactly as it appears on your Social Security card',
      isRequired: true,
      commonMistakes: [
        'Using nicknames or preferred names',
        'Inconsistent middle name usage',
        'Not updating after name change'
      ],
      tips: [
        'Use your legal name, not nicknames',
        'Match your Social Security card exactly',
        'Update Social Security records before FAFSA if name changed'
      ]
    }
  ],
  'dependency-status': [
    {
      id: 'dependency_questions',
      section: 'dependency-status',
      title: 'Answer Dependency Questions Carefully',
      description: 'Determine if you are dependent or independent for financial aid',
      isRequired: true,
      commonMistakes: [
        'Confusing FAFSA dependency with tax dependency',
        'Assuming independence based on living situation',
        'Not understanding age requirements'
      ],
      tips: [
        'Most students under 24 are dependent',
        'FAFSA dependency differs from tax dependency',
        'Review all dependency criteria carefully'
      ]
    }
  ],
  'student-finances': [
    {
      id: 'tax_information_accuracy',
      section: 'student-finances',
      title: 'Accurate Tax Information',
      description: 'Report exact tax figures from completed returns',
      isRequired: true,
      commonMistakes: [
        'Using estimated or rounded numbers',
        'Filing FAFSA before completing taxes',
        'Transcription errors from tax forms'
      ],
      tips: [
        'Complete tax return before FAFSA when possible',
        'Use IRS Data Retrieval Tool',
        'Double-check all figures against tax forms'
      ]
    },
    {
      id: 'untaxed_income_reporting',
      section: 'student-finances',
      title: 'Report All Untaxed Income',
      description: 'Include benefits, child support, and other untaxed income',
      isRequired: true,
      commonMistakes: [
        'Forgetting about benefits received',
        'Not reporting child support',
        'Overlooking disability payments'
      ],
      tips: [
        'Review all money received during tax year',
        'Include benefits even if not taxed',
        'Check FAFSA instructions for complete list'
      ]
    }
  ]
};