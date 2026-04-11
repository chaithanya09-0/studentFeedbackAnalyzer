/**
 * seed-feedbacks.js — Insert dummy feedback for all teachers
 * Run with: node seed-feedbacks.js
 */
require('dotenv').config();
const db = require('./db');
const { analyzeSentimentSync } = require('./sentiment');

// ── Teacher-Course Mapping ────────────────────────────────────────────────────
const teacherCourses = [
  { instructor: 'Dr. Sharma',    course: 'oop' },
  { instructor: 'Prof. Mehta',   course: 'oop' },
  { instructor: 'Dr. Kapoor',    course: 'oop' },
  { instructor: 'Dr. Rao',       course: 'os' },
  { instructor: 'Prof. Iyer',    course: 'os' },
  { instructor: 'Dr. Nair',      course: 'cn' },
  { instructor: 'Prof. Singh',   course: 'cn' },
  { instructor: 'Dr. Joshi',     course: 'cn' },
  { instructor: 'Dr. Verma',     course: 'aiml' },
  { instructor: 'Prof. Pandey',  course: 'aiml' },
  { instructor: 'Dr. Verma',     course: 'ml' },
  { instructor: 'Prof. Pandey',  course: 'ml' },
  { instructor: 'Dr. Saxena',    course: 'ml' },
  { instructor: 'Dr. Gupta',     course: 'dbms' },
  { instructor: 'Prof. Reddy',   course: 'dbms' },
  { instructor: 'Dr. Sharma',    course: 'dsa' },
  { instructor: 'Prof. Mishra',  course: 'dsa' },
  { instructor: 'Dr. Kapoor',    course: 'dsa' },
  { instructor: 'Prof. Thakur',  course: 'se' },
  { instructor: 'Dr. Das',       course: 'se' },
  { instructor: 'Dr. Bose',      course: 'cc' },
  { instructor: 'Prof. Chawla',  course: 'cc' },
];

// ── Feedback Templates ────────────────────────────────────────────────────────
const positiveFeedbacks = [
  "Excellent teaching! The concepts were explained with great clarity and real-world examples. I really enjoyed the lectures and learned a lot.",
  "One of the best instructors I've had. Very approachable, answers all doubts patiently, and makes complex topics seem simple.",
  "Amazing course! The practical sessions were very well organized and helped solidify theoretical concepts. Highly recommend.",
  "The instructor is incredibly knowledgeable and passionate about the subject. Every class was engaging and informative.",
  "Great class atmosphere. The instructor encourages participation and makes everyone feel comfortable asking questions.",
  "Outstanding blackboard explanations along with digital slides. The course plan was well-structured with clear milestones.",
  "I loved the case studies and projects. They gave me hands-on experience that textbooks alone can't provide.",
  "The instructor goes above and beyond to help students understand difficult concepts. Always available during office hours.",
  "Fantastic course content and delivery. The exams were fair and actually tested understanding rather than rote memorization.",
  "Very inspiring instructor who motivates students to explore beyond the syllabus. The best class this semester!",
  "Clear explanations, well-organized notes, and excellent use of multimedia in lectures. A truly enriching experience.",
  "The instructor's enthusiasm for the subject is contagious. Made me genuinely interested in pursuing this field further.",
];

const neutralFeedbacks = [
  "The course was okay overall. Some topics were covered well while others felt rushed. Could use more examples.",
  "Average teaching experience. The content was decent but the pace was sometimes too fast to follow properly.",
  "The course met my expectations but didn't exceed them. The instructor was competent but could be more engaging.",
  "Reasonable course structure. Some assignments were helpful, others felt like busy work. Mixed feelings overall.",
  "The lectures were informative but could have been more interactive. More group discussions would help.",
  "Not bad, not great. The instructor knows the subject well but the presentation style could be improved.",
  "The course content was relevant but the teaching methodology was quite traditional. Would benefit from modern approaches.",
  "Adequate coverage of topics. The textbook was useful but some supplementary materials would have been appreciated.",
  "The exams were fair but some questions were ambiguous. The instructor should review question framing.",
  "An acceptable course. The instructor was punctual and covered the syllabus, but lacked the spark to make it memorable.",
  "Standard teaching approach. Nothing particularly wrong, but also nothing that stood out as exceptional.",
  "The course was functional. Got the basics down but wished for more depth in certain advanced topics.",
];

const negativeFeedbacks = [
  "Very disappointing experience. The instructor seemed unprepared for most lectures and often went off-topic.",
  "The course was poorly organized. No clear syllabus was provided and the grading criteria kept changing.",
  "I struggled throughout this course. The teaching was unclear and the instructor was not approachable for doubts.",
  "The pace was way too fast. I couldn't keep up and the instructor didn't seem to care about slower learners.",
  "Terrible blackboard work. The writing was illegible and the explanations were confusing. Needs major improvement.",
  "The exams did not reflect what was taught in class. Many students felt blindsided by the question patterns.",
  "Lack of real-world examples made the subject very dry and boring. I lost interest halfway through the semester.",
  "The instructor frequently arrived late and dismissed classes early. We didn't cover half the syllabus properly.",
  "Very rude behavior when students asked questions. Created a hostile classroom environment that discouraged participation.",
  "The course materials were outdated. We were learning from 10-year-old slides that are no longer relevant.",
  "Extremely boring lectures with no interaction. The instructor just reads from slides word for word.",
  "Poor time management in the course. Spent too much time on basics and then rushed through critical advanced topics.",
];

// ── Rating Generators ─────────────────────────────────────────────────────────
function randomRatings(type) {
  const ranges = {
    positive: () => Math.floor(Math.random() * 2) + 4,   // 4-5
    neutral:  () => Math.floor(Math.random() * 2) + 3,   // 3-4
    negative: () => Math.floor(Math.random() * 2) + 1,   // 1-2
  };
  const gen = ranges[type];
  return Array.from({ length: 10 }, gen);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('📝 Seeding dummy feedback data...\n');

  let totalInserted = 0;

  for (const { instructor, course } of teacherCourses) {
    // 10-12 feedbacks per teacher-course combo
    const count = 10 + Math.floor(Math.random() * 3);
    
    // Distribution: ~40% positive, ~30% neutral, ~30% negative
    const posCount = Math.round(count * 0.4);
    const neuCount = Math.round(count * 0.3);
    const negCount = count - posCount - neuCount;

    const feedbackPlan = [
      ...Array(posCount).fill('positive'),
      ...Array(neuCount).fill('neutral'),
      ...Array(negCount).fill('negative'),
    ];
    const shuffled = shuffleArray(feedbackPlan);

    for (const type of shuffled) {
      const text = type === 'positive' ? pickRandom(positiveFeedbacks)
                 : type === 'neutral'  ? pickRandom(neutralFeedbacks)
                 :                       pickRandom(negativeFeedbacks);

      const questions = randomRatings(type);
      const rating = Math.round(questions.reduce((a, b) => a + b, 0) / questions.length);
      const sentiment = analyzeSentimentSync(text, rating);

      // Random date within last 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const createdAt = date.toISOString().slice(0, 19).replace('T', ' ');

      await db.execute(
        `INSERT INTO feedbacks
          (student_name, student_id, course, instructor, category, rating,
           feedback_text, is_anonymous,
           q1, q2, q3, q4, q5, q6, q7, q8, q9, q10,
           sentiment, sentiment_score, sentiment_source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'Anonymous', 'N/A', course, instructor, 'general', rating,
          text, 1,
          ...questions,
          sentiment.sentiment, sentiment.score, sentiment.source, createdAt
        ]
      );
      totalInserted++;
    }

    console.log(`  ✅ ${instructor} (${course}): ${shuffled.length} feedbacks`);
  }

  console.log(`\n🎉 Done! Inserted ${totalInserted} total feedback entries.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
