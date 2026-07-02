import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark {
  case: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

export interface IBookmarkCollection extends Document {
  owner: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  specialty?: string;
  bookmarks: IBookmark[];
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>({
  case: {
    type: Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const BookmarkCollectionSchema = new Schema<IBookmarkCollection>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Collection title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  specialty: {
    type: String,
    trim: true,
    default: 'General'
  },
  bookmarks: [BookmarkSchema]
}, {
  timestamps: true
});

// Indexes for better performance
BookmarkCollectionSchema.index({ owner: 1 });
BookmarkCollectionSchema.index({ specialty: 1 });

export default mongoose.model<IBookmarkCollection>('BookmarkCollection', BookmarkCollectionSchema);
