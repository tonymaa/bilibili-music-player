import React, { useEffect, useState } from 'react';
import { Menu, Button, Modal, Input, message } from 'antd';
import { PlusOutlined, FolderOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { usePlaylistStore } from '../../stores/playlistStore';
import { Playlist } from '@shared/types';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const { playlists, currentPlaylist, loadPlaylists, loadPlaylistDetail, createPlaylist, deletePlaylist } = usePlaylistStore();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const handleSelectPlaylist = (key: string) => {
    if (key.startsWith('playlist-')) {
      const id = key.replace('playlist-', '');
      loadPlaylistDetail(id);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      message.warning('请输入歌单名称');
      return;
    }

    const playlist = await createPlaylist(newPlaylistName.trim());
    if (playlist) {
      message.success('创建成功');
      setCreateModalVisible(false);
      setNewPlaylistName('');
    } else {
      message.error('创建失败');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlistToDelete) return;

    const success = await deletePlaylist(playlistToDelete.id);
    if (success) {
      message.success('删除成功');
      setDeleteModalVisible(false);
      setPlaylistToDelete(null);
    } else {
      message.error('删除失败');
    }
  };

  const menuItems = [
    {
      key: 'playlists',
      label: '我的歌单',
      type: 'group' as const,
      children: playlists.map(p => ({
        key: `playlist-${p.id}`,
        label: (
          <div className={styles.menuItem}>
            <span className={styles.menuItemText}>{p.title}</span>
            <span className={styles.menuItemCount}>{p.songCount}</span>
          </div>
        ),
        icon: <FolderOutlined />
      }))
    }
  ];

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <span>歌单列表</span>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        />
      </div>

      <Menu
        mode="inline"
        selectedKeys={currentPlaylist ? [`playlist-${currentPlaylist.id}`] : []}
        onClick={({ key }) => handleSelectPlaylist(key)}
        items={menuItems}
        className={styles.menu}
      />

      {/* 创建歌单对话框 */}
      <Modal
        title="创建歌单"
        open={createModalVisible}
        onOk={handleCreatePlaylist}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewPlaylistName('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入歌单名称"
          value={newPlaylistName}
          onChange={e => setNewPlaylistName(e.target.value)}
          onPressEnter={handleCreatePlaylist}
        />
      </Modal>

      {/* 删除歌单确认对话框 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDeletePlaylist}
        onCancel={() => {
          setDeleteModalVisible(false);
          setPlaylistToDelete(null);
        }}
        okText="删除"
        okButtonProps={{ danger: true }}
        cancelText="取消"
      >
        <p>确定要删除歌单 "{playlistToDelete?.title}" 吗？</p>
      </Modal>
    </div>
  );
};

export default Sidebar;
