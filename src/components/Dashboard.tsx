import { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import styles from './Dashboard.module.css';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

const Dashboard = () => {
  const [input, setInput] = useState('');
  const [handles, setHandles] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addHandle = () => {
    if (input.trim() && !handles.includes(input.trim())) {
      setHandles([...handles, input.trim()]);
      setInput('');
    }
  };

  const fetchData = async () => {
    if (handles.length === 0) return;
    setLoading(true);
    const res = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handles }),
    });
    const data = await res.json();
    setResults(data.results);
    setLoading(false);
  };

  const parseSummary = (summary: string) => {
    const lines = summary.split('\n').filter((line) => line.includes('Sentiment'));
    const sentimentCounts: Record<string, number> = {};
    lines.forEach((line) => {
      if (line.includes('Positive')) sentimentCounts['Positive'] = (sentimentCounts['Positive'] || 0) + 1;
      else if (line.includes('Neutral')) sentimentCounts['Neutral'] = (sentimentCounts['Neutral'] || 0) + 1;
      else if (line.includes('Negative')) sentimentCounts['Negative'] = (sentimentCounts['Negative'] || 0) + 1;
    });
    return Object.entries(sentimentCounts).map(([name, value]) => ({ name, value }));
  };

  const extractSentimentPerTweet = (summary: string) => {
    const tweetBlocks = summary.split(/\n(?=\d+\. )/g);
    const result = tweetBlocks.map((block) => {
      const sentimentMatch = block.match(/Sentiment:\s*(Positive|Neutral|Negative)/i);
      const topicMatch = block.match(/Topic:\s*(.*)/i);
      return {
        sentiment: sentimentMatch ? sentimentMatch[1] : 'Unknown',
        topic: topicMatch ? topicMatch[1].trim() : 'Unknown',
      };
    });
    return result;
  };
  

  const getBarChartData = () => {
    return results.map((result) => {
      const sentimentData = parseSummary(result.summary);
      const obj: any = { name: result.handle };
      sentimentData.forEach((item) => {
        obj[item.name] = item.value;
      });
      return obj;
    });
  };

  const sentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return '#82ca9d';
      case 'Neutral': return '#8884d8';
      case 'Negative': return '#ffc658';
      default: return '#ccc';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>X Sentiment Dashboard</h1>

      <div className={styles.inputGroup}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter X handle"
          className={styles.input}
        />
        <button onClick={addHandle} className={styles.button}>Add</button>
        <button onClick={fetchData} className={styles.button}>Analyze</button>
      </div>

      <div>
        <strong>Handles:</strong> {handles.join(', ')}
      </div>

      {loading && <p>Analyzing tweets... Please wait ⏳</p>}

      {results.length > 1 && (
        <div className={styles.chartSection}>
          <h2>📊 Sentiment Comparison</h2>
          <BarChart
            width={800}
            height={300}
            data={getBarChartData()}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Positive" fill="#82ca9d" />
            <Bar dataKey="Neutral" fill="#8884d8" />
            <Bar dataKey="Negative" fill="#ffc658" />
          </BarChart>
        </div>
      )}

      <div className={styles.resultsGrid}>
        {results.map((result, index) => {
          const tweetSentiments = extractSentimentPerTweet(result.summary);
          return (
            <div key={index} className={styles.card}>
              <h2>@{result.handle}</h2>
              {result.error ? (
                <p>Error: {result.error}</p>
              ) : (
                <>
                  <h3>Sentiment Breakdown</h3>
                  <PieChart width={300} height={300}>
                    <Pie
                      data={parseSummary(result.summary)}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label
                    >
                      {parseSummary(result.summary).map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>

                  <h3>Tweets</h3>
                  <div className={styles.tweetList}>
                    {result.tweets?.map((tweet: string, i: number) => (
                      <div
                        key={i}
                        className={styles.tweetCard}
                        style={{ borderLeft: `6px solid ${sentimentColor(tweetSentiments[i]?.sentiment)}` }}
                      >
                        <p><strong>Sentiment:</strong> {tweetSentiments[i]?.sentiment || 'Unknown'}</p>
                        <p><strong>Topic:</strong> {tweetSentiments[i]?.topic || 'Unknown'}</p>
                        <p>{tweet}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;