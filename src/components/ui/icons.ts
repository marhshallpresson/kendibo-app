// Tree-shaken lucide entry — Metro cannot shake the barrel
// (lucide-react-native re-exports ~15k icons), so every screen imports from
// this module instead. Each deep import resolves via the package's
// `exports` map (./icons/* -> one icon module + its types).
//
// lucide-react-native@1.52 renamed several icons (e.g. alert-circle ->
// circle-alert). The import aliases below keep the historical export names
// that ~140 call sites already use, so no consumer has to change.
import ArrowDownLeft from 'lucide-react-native/icons/arrow-down-left';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import Bell from 'lucide-react-native/icons/bell';
import BellRing from 'lucide-react-native/icons/bell-ring';
import Bookmark from 'lucide-react-native/icons/bookmark';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Building from 'lucide-react-native/icons/building';
import BuildingComplex from 'lucide-react-native/icons/building-complex';
import Calendar from 'lucide-react-native/icons/calendar';
import CalendarCheck from 'lucide-react-native/icons/calendar-check';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import CircleCheckBig from 'lucide-react-native/icons/circle-check-big';
import CheckCheck from 'lucide-react-native/icons/check-check';
import SquareCheck from 'lucide-react-native/icons/square-check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Circle from 'lucide-react-native/icons/circle';
import CircleDollarSign from 'lucide-react-native/icons/circle-dollar-sign';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import Clock from 'lucide-react-native/icons/clock';
import Compass from 'lucide-react-native/icons/compass';
import Copy from 'lucide-react-native/icons/copy';
import Cpu from 'lucide-react-native/icons/cpu';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Delete from 'lucide-react-native/icons/delete';
import Download from 'lucide-react-native/icons/download';
import Pencil from 'lucide-react-native/icons/pencil';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import FileCheck from 'lucide-react-native/icons/file-check';
import FileText from 'lucide-react-native/icons/file-text';
import FingerprintPattern from 'lucide-react-native/icons/fingerprint-pattern';
import Gift from 'lucide-react-native/icons/gift';
import Globe from 'lucide-react-native/icons/globe';
import Grid2x2 from 'lucide-react-native/icons/grid-2x2';
import Hammer from 'lucide-react-native/icons/hammer';
import Heart from 'lucide-react-native/icons/heart';
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark';
import House from 'lucide-react-native/icons/house';
import Inbox from 'lucide-react-native/icons/inbox';
import ImagePlus from 'lucide-react-native/icons/image-plus';
import Info from 'lucide-react-native/icons/info';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import LoaderCircle from 'lucide-react-native/icons/loader-circle';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapPin from 'lucide-react-native/icons/map-pin';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Mic from 'lucide-react-native/icons/mic';
import MicOff from 'lucide-react-native/icons/mic-off';
import Minus from 'lucide-react-native/icons/minus';
import Moon from 'lucide-react-native/icons/moon';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Navigation from 'lucide-react-native/icons/navigation';
import Paintbrush from 'lucide-react-native/icons/paintbrush';
import Paperclip from 'lucide-react-native/icons/paperclip';
import Phone from 'lucide-react-native/icons/phone';
import PhoneIncoming from 'lucide-react-native/icons/phone-incoming';
import PhoneMissed from 'lucide-react-native/icons/phone-missed';
import PhoneOff from 'lucide-react-native/icons/phone-off';
import PhoneOutgoing from 'lucide-react-native/icons/phone-outgoing';
import Plus from 'lucide-react-native/icons/plus';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import Search from 'lucide-react-native/icons/search';
import SearchX from 'lucide-react-native/icons/search-x';
import Send from 'lucide-react-native/icons/send';
import Share2 from 'lucide-react-native/icons/share-2';
import Shield from 'lucide-react-native/icons/shield';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Square from 'lucide-react-native/icons/square';
import Star from 'lucide-react-native/icons/star';
import Store from 'lucide-react-native/icons/store';
import Tag from 'lucide-react-native/icons/tag';
import ThumbsUp from 'lucide-react-native/icons/thumbs-up';
import Trash from 'lucide-react-native/icons/trash';
import Tv from 'lucide-react-native/icons/tv';
import CloudUpload from 'lucide-react-native/icons/cloud-upload';
import User from 'lucide-react-native/icons/user';
import UserRound from 'lucide-react-native/icons/user-round';
import Video from 'lucide-react-native/icons/video';
import VideoOff from 'lucide-react-native/icons/video-off';
import Volume2 from 'lucide-react-native/icons/volume-2';
import VolumeX from 'lucide-react-native/icons/volume-x';
import Wallet from 'lucide-react-native/icons/wallet';
import Wind from 'lucide-react-native/icons/wind';
import Wrench from 'lucide-react-native/icons/wrench';
import X from 'lucide-react-native/icons/x';
import CircleX from 'lucide-react-native/icons/circle-x';
import Zap from 'lucide-react-native/icons/zap';

export {
  CircleAlert as AlertCircle,
  TriangleAlert as AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellRing,
  Bookmark,
  Briefcase,
  Building,
  BuildingComplex as Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CircleCheckBig as CheckCircle2,
  CheckCheck,
  SquareCheck as CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDollarSign,
  CircleUserRound,
  Clock,
  Compass,
  Copy,
  Cpu,
  CreditCard,
  Delete,
  Download,
  Pencil as Edit2,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  FingerprintPattern,
  Gift,
  Globe,
  Grid2x2 as Grid,
  Hammer,
  Heart,
  CircleQuestionMark as HelpCircle,
  House as Home,
  ImagePlus,
  Inbox,
  Info,
  LayoutDashboard,
  LoaderCircle as Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Mic,
  MicOff,
  Minus,
  Moon,
  Ellipsis as MoreHorizontal,
  Navigation,
  Paintbrush,
  Paperclip,
  Pencil,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  PhoneOutgoing,
  Plus,
  RotateCcw,
  Search,
  SearchX,
  Send,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Store,
  Tag,
  ThumbsUp,
  Trash as Trash2,
  Tv,
  CloudUpload as UploadCloud,
  User,
  UserRound,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wallet,
  Wind,
  Wrench,
  X,
  CircleX as XCircle,
  Zap,
};
