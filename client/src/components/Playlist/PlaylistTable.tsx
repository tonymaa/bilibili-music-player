import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, Input, message, Dropdown, Modal } from 'antd';
import { PlayCircleOutlined, PlusOutlined, DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePlaylistStore } from '../../stores/playlistStore';
import { usePlayerStore } from '../../stores/playerStore';
import { Song } from '@shared/types';
import styles from './PlaylistTable.module.css';

const PlaylistTable: React.FC = () => {
  const { currentPlaylist, removeSongsFromPlaylist, renameSongInPlaylist, playlists, addSongsToPlaylist, loadPlaylistDetail, loadPlaylistAllSongs } = usePlaylistStore();
  const { playSong, addToPlaylist } = usePlayerStore();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [songToRename, setSongToRename] = useState<Song | null>(null);
  const [newSongName, setNewSongName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 切换歌单时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [currentPlaylist?.id]);

  if (!currentPlaylist) {
    return (
      <div className={styles.empty}>
        <p>请选择一个歌单</p>
      </div>
    );
  }

  const songs = currentPlaylist.songs || [];
  const filteredSongs = searchText
    ? songs.filter(s => s.name.toLowerCase().includes(searchText.toLowerCase()) || s.singer.toLowerCase().includes(searchText.toLowerCase()))
    : songs;
  const total = currentPlaylist.total || currentPlaylist.songCount || 0;

  const handlePlay = (song: Song) => {
    playSong(song);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
    if (currentPlaylist) {
      loadPlaylistDetail(currentPlaylist.id, 1, value || undefined);
    }
  };

  const handleAddToNowPlaying = (song: Song) => {
    addToPlaylist([song]);
    message.success('已添加到播放列表');
  };

  const handleDelete = async (songId: string) => {
    await removeSongsFromPlaylist(currentPlaylist.id, [songId]);
    message.success('已删除');
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择歌曲');
      return;
    }
    await removeSongsFromPlaylist(currentPlaylist.id, selectedRowKeys as string[]);
    setSelectedRowKeys([]);
    message.success(`已删除 ${selectedRowKeys.length} 首歌曲`);
  };

  const handleBatchAddToPlaylist = async (targetPlaylistId: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择歌曲');
      return;
    }
    const songsToAdd = songs.filter(s => selectedRowKeys.includes(s.id));
    await addSongsToPlaylist(targetPlaylistId, songsToAdd);
    setSelectedRowKeys([]);
    message.success('已添加到歌单');
  };

  const handleRename = async () => {
    if (!songToRename || !newSongName.trim()) return;
    await renameSongInPlaylist(currentPlaylist.id, songToRename.id, newSongName.trim());
    setRenameModalVisible(false);
    setSongToRename(null);
    setNewSongName('');
    message.success('重命名成功');
  };

  const columns: ColumnsType<Song> = [
    {
      title: '歌曲名',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string, record: Song) => (
        <a onClick={() => handlePlay(record)} className={styles.songName}>
          {text}
        </a>
      )
    },
    {
      title: '歌手',
      dataIndex: 'singer',
      key: 'singer',
      width: 150,
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Song) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handlePlay(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAddToNowPlaying(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setSongToRename(record);
              setNewSongName(record.name);
              setRenameModalVisible(true);
            }}
          />
          <Popconfirm
            title="确定删除这首歌吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys)
  };

  const addToPlaylistMenuItems = playlists
    .filter(p => p.id !== currentPlaylist.id)
    .map(p => ({
      key: p.id,
      label: p.title
    }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{currentPlaylist.title}</h2>
        <div className={styles.actions}>
          <Input.Search
            placeholder="搜索歌曲"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          {selectedRowKeys.length > 0 && (
            <>
              <Popconfirm
                title={`确定删除选中的 ${selectedRowKeys.length} 首歌曲吗？`}
                onConfirm={handleBatchDelete}
                okText="删除"
                cancelText="取消"
              >
                <Button danger>删除选中</Button>
              </Popconfirm>
              <Dropdown
                menu={{
                  items: addToPlaylistMenuItems,
                  onClick: ({ key }) => handleBatchAddToPlaylist(key)
                }}
              >
                <Button>添加到歌单</Button>
              </Dropdown>
            </>
          )}
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={async () => {
              if (currentPlaylist) {
                const allSongs = await loadPlaylistAllSongs(currentPlaylist.id);
                const { setPlaylist } = usePlayerStore.getState();
                setPlaylist(allSongs, true);
              }
            }}
          >
            播放全部
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredSongs}
        rowSelection={rowSelection}
        pagination={{
          current: currentPage,
          total: total,
          pageSize: 50,
          showSizeChanger: true,
          showTotal: total => `共 ${total} 首`,
          onChange: (page) => {
            setCurrentPage(page);
            if (currentPlaylist) {
              loadPlaylistDetail(currentPlaylist.id, page, searchText || undefined);
            }
          }
        }}
        size="small"
      />

      <Modal
        title="重命名歌曲"
        open={renameModalVisible}
        onOk={handleRename}
        onCancel={() => {
          setRenameModalVisible(false);
          setSongToRename(null);
          setNewSongName('');
        }}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={newSongName}
          onChange={e => setNewSongName(e.target.value)}
          onPressEnter={handleRename}
        />
      </Modal>
    </div>
  );
};

export default PlaylistTable;
