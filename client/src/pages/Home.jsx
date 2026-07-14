import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Header from '../components/Header.jsx';
import Hero from '../components/Hero.jsx';
import AgentGrid from '../components/AgentGrid.jsx';
import Footer from '../components/Footer.jsx';

export default function Home() {
  const [queriesEmail, setQueriesEmail] = useState('');

  useEffect(() => {
    api.getConfig().then((c) => setQueriesEmail(c.queriesEmail)).catch(() => {});
  }, []);

  return (
    <>
      <Header />
      <Hero />
      <AgentGrid />
      <Footer queriesEmail={queriesEmail} />
    </>
  );
}
