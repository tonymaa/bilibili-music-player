import React, { useState } from 'react';
import MainLayout from './components/Layout/MainLayout';
import PlaylistTable from './components/Playlist/PlaylistTable';
import AudioPlayer from './components/Player/AudioPlayer';
import PlayerPanel from './components/Player/PlayerPanel';
import LyricPanel from './components/Lyric/LyricPanel';
import { Button } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';

const App: React.FC = () => {
  const [lyricVisible, setLyricVisible] = useState(false);
  const [playerPanelVisible, setPlayerPanelVisible] = useState(false);

  return (
    <>
      <MainLayout>
        <PlaylistTable />
      </MainLayout>

      <AudioPlayer onOpenPlayerPanel={() => setPlayerPanelVisible(true)} />

      {/* 歌词按钮 */}
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<CustomerServiceOutlined />}
        onClick={() => setLyricVisible(true)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 96,
          zIndex: 999
        }}
      />

      <LyricPanel visible={lyricVisible} onClose={() => setLyricVisible(false)} />
      <PlayerPanel visible={playerPanelVisible} onClose={() => setPlayerPanelVisible(false)} />
    </>
  );
};

export default App;
