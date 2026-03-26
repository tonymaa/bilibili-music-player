import { Router } from 'express';
import bilibiliRoutes from './bilibili';
import playlistRoutes from './playlist';
import lyricRoutes from './lyric';
import playerRoutes from './player';

const router = Router();

router.use('/bilibili', bilibiliRoutes);
router.use('/playlists', playlistRoutes);
router.use('/lyric', lyricRoutes);
router.use('/player', playerRoutes);

export default router;
