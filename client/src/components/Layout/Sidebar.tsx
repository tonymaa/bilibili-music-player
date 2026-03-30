import React, { useEffect, useState } from 'react';
import { Menu, Button, Modal, Input, message, Dropdown, Radio } from 'antd';
import { PlusOutlined, FolderOutlined, DeleteOutlined, EditOutlined, MoreOutlined, SyncOutlined } from '@ant-design/icons';
import { usePlaylistStore } from '../../stores/playlistStore';
import { Playlist } from '@shared/types';
import styles from './Sidebar.module.css';

const Sidebar: React.FC = () => {
  const { playlists, currentPlaylist, loadPlaylists, loadPlaylistDetail, createPlaylist, createSubscriptionPlaylist, deletePlaylist, updatePlaylist, syncSubscriptionPlaylist } = usePlaylistStore();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistType, setNewPlaylistType] = useState<'normal' | 'subscription'>('normal');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [playlistToRename, setPlaylistToRename] = useState<Playlist | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameKeyword, setRenameKeyword] = useState('');

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

    if (newPlaylistType === 'subscription' && !searchKeyword.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    let playlist;
    if (newPlaylistType === 'subscription') {
      playlist = await createSubscriptionPlaylist(newPlaylistName.trim(), searchKeyword.trim());
    } else {
      playlist = await createPlaylist(newPlaylistName.trim());
    }

    if (playlist) {
      message.success('创建成功');
      setCreateModalVisible(false);
      setNewPlaylistName('');
      setNewPlaylistType('normal');
      setSearchKeyword('');
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

  const handleRenamePlaylist = async () => {
    if (!playlistToRename || !renameValue.trim()) {
      message.warning('请输入歌单名称');
      return;
    }

    const data: { title: string; searchKeyword?: string } = { title: renameValue.trim() };
    if (playlistToRename.playlistType === 'subscription' && renameKeyword.trim()) {
      data.searchKeyword = renameKeyword.trim();
    }

    const success = await updatePlaylist(playlistToRename.id, data);
    if (success) {
      message.success('更新成功');
      setRenameModalVisible(false);
      setPlaylistToRename(null);
      setRenameValue('');
      setRenameKeyword('');
    } else {
      message.error('更新失败');
    }
  };

  const getPlaylistMenuItems = (playlist: Playlist) => {
    const items = [
      {
        key: 'rename',
        label: '重命名',
        icon: <EditOutlined />,
        onClick: () => {
          setPlaylistToRename(playlist);
          setRenameValue(playlist.title);
          setRenameKeyword(playlist.searchKeyword || '');
          setRenameModalVisible(true);
        }
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          setPlaylistToDelete(playlist);
          setDeleteModalVisible(true);
        }
      }
    ];

    // 订阅歌单添加同步选项
    if (playlist.playlistType === 'subscription') {
      items.unshift({
        key: 'sync',
        label: '立即同步',
        icon: <SyncOutlined />,
        onClick: async () => {
          const result = await syncSubscriptionPlaylist(playlist.id);
          if (result) {
            message.success(`同步成功，新增 ${result.addedCount} 首歌曲`);
          } else {
            message.error('同步失败');
          }
        }
      });
    }

    return items;
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
            <div className={styles.menuItemRight}>
              {p.songCount > 0 && <span className={styles.menuItemCount}>{p.songCount}</span>}
              <Dropdown
                menu={{ items: getPlaylistMenuItems(p) }}
                trigger={['click']}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  className={styles.menuItemBtn}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </div>
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
          setNewPlaylistType('normal');
          setSearchKeyword('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            placeholder="请输入歌单名称"
            value={newPlaylistName}
            onChange={e => setNewPlaylistName(e.target.value)}
            onPressEnter={handleCreatePlaylist}
          />
          <Radio.Group value={newPlaylistType} onChange={e => setNewPlaylistType(e.target.value)}>
            <Radio value="normal">普通歌单</Radio>
            <Radio value="subscription">订阅歌单</Radio>
          </Radio.Group>
          {newPlaylistType === 'subscription' && (
            <Input
              placeholder="请输入搜索关键词（订阅歌单将每12小时同步一次）"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
            />
          )}
        </div>
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

      {/* 重命名/编辑歌单对话框 */}
      <Modal
        title={playlistToRename?.playlistType === 'subscription' ? '编辑同步歌单' : '重命名歌单'}
        open={renameModalVisible}
        onOk={handleRenamePlaylist}
        onCancel={() => {
          setRenameModalVisible(false);
          setPlaylistToRename(null);
          setRenameValue('');
          setRenameKeyword('');
        }}
        okText="确定"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            placeholder="请输入歌单名称"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onPressEnter={handleRenamePlaylist}
          />
          {playlistToRename?.playlistType === 'subscription' && (
            <Input
              placeholder="请输入搜索关键词（BV号、收藏夹ID或B站链接）"
              value={renameKeyword}
              onChange={e => setRenameKeyword(e.target.value)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Sidebar;
