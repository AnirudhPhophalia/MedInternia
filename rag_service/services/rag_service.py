from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter

class MedicalRAGService:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.vector_store = Chroma(
            persist_directory="./chroma_db",
            embedding_function=self.embeddings
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100
        )

    def ingest_case(self, case_id: str, text: str, metadata: dict):
        chunks = self.text_splitter.split_text(text)
        
        # Ensure metadata contains the case_id
        doc_metadata = metadata.copy()
        doc_metadata["case_id"] = case_id
        
        metadatas = [doc_metadata for _ in chunks]
        
        self.vector_store.add_texts(
            texts=chunks,
            metadatas=metadatas
        )

    def get_similar_cases(self, query_text: str, k: int = 3):
        results = self.vector_store.similarity_search_with_score(query_text, k=k)
        
        clean_results = []
        for doc, score in results:
            clean_results.append({
                "case_id": doc.metadata.get("case_id"),
                "score": float(score),
                "metadata": doc.metadata,
                "text_snippet": doc.page_content
            })
            
        return clean_results
